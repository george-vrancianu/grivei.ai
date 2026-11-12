import sys
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WATCHDOG / "connectors"))
sys.path.insert(0, str(WATCHDOG))  # the `pipeline` package
