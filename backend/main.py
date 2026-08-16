from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import torch
import librosa
import soundfile as sf
import numpy as np

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "separated"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"message": "Server running."}

@app.post("/convert")
async def convert_song(file: UploadFile = File(...)):
    filename = file.filename
    input_path = os.path.join(UPLOAD_DIR, filename)

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load audio file using librosa with soundfile backend (no torchcodec)
        print(f"Loading audio file: {input_path}")
        y, sr = librosa.load(input_path, sr=16000, mono=False)
        print(f"Audio loaded: sample rate={sr}, shape={y.shape}")
        
        # Handle mono/stereo
        if len(y.shape) == 1:
            # Mono to stereo
            y = np.stack([y, y])
        elif y.shape[0] > 2:
            # More than 2 channels, take first 2
            y = y[:2]
        
        # Ensure data type is float32
        y = y.astype(np.float32)
        
        # Convert to torch tensor
        wav = torch.from_numpy(y).float()
        print(f"Tensor shape: {wav.shape}")
        
        # Apply demucs separation 
        from demucs.pretrained import get_model
        from demucs.apply import apply_model
        
        print("Loading Demucs model...")
        model = get_model('htdemucs')
        model = model.to('cpu')
        model.eval()
        
        print("Running separation...")
        with torch.no_grad():
            # Use apply_model from demucs.apply
            # It handles BagOfModels automatically
            # Input shape needs to be [batch, channels, samples]
            sources = apply_model(model, wav.unsqueeze(0), device='cpu', progress=False)
        
        # sources shape: [batch, sources, channels, samples]
        # Remove batch dimension: [sources, channels, samples]
        sources = sources[0]

        # Order in htdemucs: [drums, bass, other, vocals]
        print(f"Sources shape: {sources.shape}")

        # Prefer the generated instrumental stems directly instead of subtracting vocals
        # from the original mix; this keeps the non-vocal content intact without the
        # phase artifacts produced by simple subtraction.
        if sources.shape[0] < 4:
            raise ValueError(f"Unexpected Demucs output shape: {sources.shape}")

        instrumental_stem = sources[:3].sum(dim=0)
        instrumental_np = instrumental_stem.cpu().numpy().astype(np.float32)

        # Keep the output aligned to the original signal dimensions.
        if instrumental_np.shape[0] != y.shape[0]:
            instrumental_np = instrumental_np[: y.shape[0]]
        if instrumental_np.shape[1] > y.shape[1]:
            instrumental_np = instrumental_np[:, : y.shape[1]]

        # Clamp to prevent clipping.
        instrumental_np = np.clip(instrumental_np, -1.0, 1.0)

        # Save as WAV file using soundfile (no torchcodec dependency)
        song_name = os.path.splitext(filename)[0]
        output_dir = os.path.join(OUTPUT_DIR, "htdemucs", song_name)
        os.makedirs(output_dir, exist_ok=True)

        out_path = os.path.join(output_dir, "no_vocals.wav")
        print(f"Saving instrumental to: {out_path}")
        sf.write(out_path, instrumental_np.T, sr)  # Transpose for soundfile (expects [samples, channels])
        print(f"Instrumental saved successfully")
        
        if os.path.exists(out_path):
            return FileResponse(out_path, filename="karaoke.wav", media_type="audio/wav")
        else:
            print(f"[ERROR] Output file not found: {out_path}")
            return JSONResponse(content={"error": "Instrumental not found."}, status_code=500)

    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": "Failed to process audio", "details": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
