class InvalidFile(Exception):
    """The file failed validation; `problems` says why, for the quarantine reason file."""

    def __init__(self, reason: str, problems: list[str] | None = None):
        super().__init__(reason)
        self.reason = reason
        self.problems = problems or []
