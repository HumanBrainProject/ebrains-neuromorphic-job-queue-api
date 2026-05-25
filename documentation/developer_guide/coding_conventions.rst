==================
Coding conventions
==================

Style
=====

- The project targets Python 3.11+.
- Style is PEP 8 with a 119-character line limit.
- Lint and formatting are enforced by `Ruff <https://docs.astral.sh/ruff/>`_.
  Configuration lives in ``api/pyproject.toml``.

Run before pushing::

    $ ruff check api/simqueue
    $ ruff format --check api/simqueue

The legacy code base is not yet fully reformatted. New and modified code
must pass ``ruff check``; older files will be reformatted opportunistically
as they are touched, so that diffs remain reviewable.

Docstrings
==========

Docstrings use the `Google style`_::

    def submit_job(script: str, platform: str) -> Job:
        """Submit a PyNN script to the chosen neuromorphic platform.

        Args:
            script: The PyNN script source, as a string.
            platform: One of ``"SpiNNaker"``, ``"BrainScaleS"``,
                ``"BrainScaleS-2"`` or ``"Spikey"``.

        Returns:
            The newly created :class:`Job`, populated with its server-side
            identifier.

        Raises:
            ValueError: If *platform* is unknown.
        """

Public functions, classes and modules should have a docstring; trivial
helpers may be left undocumented if their name and signature make the
intent obvious.

Type hints
==========

All new code should be fully type-annotated. The project does not yet run
``mypy`` in CI, but new annotations should be
``mypy --strict``-compatible where reasonable.

Commit messages
===============

- Imperative mood, sentence case, no trailing period.
- Subject line ≤72 characters.
- Optional body (separated by a blank line) explains *why*, not *what*.

Examples::

    Add per-user statistics endpoint

    Send notification e-mail when project is submitted for review

    Fix path to uvicorn following change to using venv

Avoid::

    updated code              # vague
    Fixed the bug.            # past tense, trailing period
    feat(api): add endpoint   # we don't use conventional-commits prefixes


.. _`Google style`: https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings
