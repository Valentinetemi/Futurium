# Futurium processing API

This local FastAPI service accepts one saved room sweep, extracts useful frames
and returns a processing manifest. It does not perform semantic search, object
detection or language-model inference.

## Requirements and setup

- Python 3.11 or later
- FFmpeg and FFprobe available on `PATH`

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
cp .env.example .env
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

`0.0.0.0` lets a phone on the same trusted LAN reach the development server.
There is no authentication in this prototype; do not expose it publicly.

## Endpoints

- `GET /health` — checks whether FFmpeg and FFprobe are available
- `POST /sweeps` — accepts multipart fields `sweep_id` and `video`, then returns
  HTTP 202 with the generated job manifest
- `GET /sweeps/{job_id}` — returns the current processing manifest
- `GET /sweeps/{job_id}/thumbnails/{frame_id}.jpg` — serves retained thumbnails

Upload an MP4, MOV, M4V or WebM:

```bash
curl -X POST http://localhost:8000/sweeps \
  -F "sweep_id=1" \
  -F "video=@/absolute/path/to/room-sweep.mov;type=video/quicktime"
```

Poll the job returned as `jobId`:

```bash
curl http://localhost:8000/sweeps/JOB_ID
```

Errors have a stable JSON shape:

```json
{
  "error": {
    "code": "unsupported_media_type",
    "message": "Upload an MP4, MOV, M4V, or WebM video."
  }
}
```

## Processing manifest

The camel-cased response includes:

- `jobId`, the generated server identifier
- `sweepId`, the mobile SQLite identifier supplied by the client
- `status`: `processing`, `ready` or `failed`
- `duration`, in seconds
- sampled, retained, blurry-rejected and duplicate-rejected frame counts
- retained frames with `frameId`, `timestamp` and `thumbnailUrl`
- a structured `error` when processing fails

Client filenames are never used for storage. Job and frame identifiers are
validated before paths are resolved. Uploads are streamed in bounded chunks and
limited to 100 MiB by default.

## Frame selection

1. FFprobe reads the video duration.
2. FFmpeg's `fps` filter samples approximately two frames per second.
3. Each sample receives the timestamp `sample index / configured sample FPS`.
4. OpenCV converts the image to grayscale and calculates
   `variance(cv2.Laplacian(gray, cv2.CV_64F))`. A value below the configurable
   default threshold of `100` is treated as visibly blurry. This is an
   application heuristic, not a universal image-quality score, and should be
   tuned using representative phone footage.
5. A 64-bit difference hash is compared with the previous retained frame. A
   Hamming distance of `5` or less is treated as a near-duplicate by default.
6. Full retained JPEG frames and 320-pixel-wide thumbnails are stored.

The temporary uploaded source is removed in a `finally` path whether processing
succeeds or fails. Temporary sampled frames are also deleted. Manifests,
retained frames and thumbnails remain under `FUTURIUM_DATA_DIR` for later search
development.

## Environment variables

| Variable                           |     Default | Purpose                          |
| ---------------------------------- | ----------: | -------------------------------- |
| `FUTURIUM_DATA_DIR`                |    `./data` | Manifest and retained-frame root |
| `FUTURIUM_MAX_UPLOAD_BYTES`        | `104857600` | Maximum upload size in bytes     |
| `FUTURIUM_SAMPLE_FPS`              |         `2` | Approximate samples per second   |
| `FUTURIUM_BLUR_THRESHOLD`          |       `100` | Minimum Laplacian variance       |
| `FUTURIUM_DUPLICATE_HASH_DISTANCE` |         `5` | Maximum duplicate dHash distance |
| `FUTURIUM_THUMBNAIL_WIDTH`         |       `320` | Thumbnail width in pixels        |
| `FUTURIUM_PROCESS_TIMEOUT_SECONDS` |       `180` | FFmpeg/FFprobe timeout           |

## Tests and checks

```bash
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

The test fixture is generated from six synthetic frames at runtime. With the
default settings, the test asserts 6 sampled frames, 3 retained frames, 1 blur
rejection and 2 consecutive-duplicate rejections. No fixture video is stored in
Git.
