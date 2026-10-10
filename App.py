"""Build the React UI and run the complete local demo: python App.py."""
import argparse
import importlib.util
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist" / "index.html"


def needs_build():
    if not DIST.is_file():
        return True
    inputs = [FRONTEND / name for name in (
        "src", "public", "index.html", "package.json", "package-lock.json",
        "vite.config.js", ".env", ".env.local", ".env.production", ".env.production.local",
    )]
    return any(
        file.stat().st_mtime > DIST.stat().st_mtime
        for entry in inputs
        for file in (entry.rglob("*") if entry.is_dir() else [entry])
        if file.is_file()
    )


def use_project_python():
    venv = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if venv.is_file() and Path(sys.executable).resolve() != venv.resolve():
        return subprocess.call([str(venv), str(Path(__file__).resolve()), *sys.argv[1:]], cwd=ROOT)
    return None


def run(port, rebuild=False, open_browser=True):
    for module in ("uvicorn", "fastapi", "sklearn", "pandas", "joblib", "dotenv"):
        if importlib.util.find_spec(module) is None:
            raise RuntimeError(f"Missing Python dependency: {module}. Install requirements.txt into .venv first.")
    if not (ROOT / "backend/prediction/artifacts/rul_model.joblib").is_file():
        raise RuntimeError("RUL model is missing: backend/prediction/artifacts/rul_model.joblib")
    with socket.socket() as probe:
        try:
            probe.bind(("127.0.0.1", port))
        except OSError as error:
            raise RuntimeError(f"Port {port} is already in use. Close the previous demo or run App.py --port {port + 1}.") from error

    if rebuild or needs_build():
        npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
        if not npm:
            raise RuntimeError("Node.js/npm is needed to build the UI. Install Node.js, then run this launcher again.")
        if not (FRONTEND / "node_modules").is_dir():
            print("Installing frontend dependencies (first run needs internet)…", flush=True)
            subprocess.run([npm, "ci"], cwd=FRONTEND, check=True)
        print("Building frontend…", flush=True)
        env = {**os.environ, "VITE_API_URL": ""}
        subprocess.run([npm, "run", "build"], cwd=FRONTEND, env=env, check=True)
    else:
        print("Using the existing frontend build.", flush=True)

    url = f"http://127.0.0.1:{port}"
    print(f"Starting demo at {url} — press Ctrl+C to stop.", flush=True)
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT,
    )
    try:
        # Ignore system proxies for this loopback readiness check.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Backend exited before becoming ready. See the server error above.")
            try:
                with opener.open(f"{url}/health", timeout=1) as response:
                    if response.status == 200:
                        break
            except (urllib.error.URLError, TimeoutError, OSError):
                time.sleep(0.3)
        else:
            raise RuntimeError("Backend did not become ready within 120 seconds. See the server output above.")
        print(f"Demo ready: {url}", flush=True)
        if open_browser:
            webbrowser.open(url)
        return process.wait()
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--rebuild", action="store_true", help="Force a fresh frontend build")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    try:
        delegated = use_project_python()
        return delegated if delegated is not None else run(args.port, args.rebuild, not args.no_browser)
    except KeyboardInterrupt:
        print("\nDemo stopped.")
        return 0
    except (RuntimeError, subprocess.CalledProcessError, OSError) as error:
        print(f"\nUnable to start demo: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
