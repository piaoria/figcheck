"""Package only explicit source/build/docs assets; never include credentials or dependencies."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
release = root / "release"
release.mkdir(exist_ok=True)
archive = release / "FigCheck-MVP-0.3.7.zip"
top_files = {"package.json", "package-lock.json", "tsconfig.json", "eslint.config.mjs", "README.md", ".gitignore"}
top_dirs = {"apps", "packages", "schemas", "fixtures", "docs", "scripts", "tests"}
evidence = {"figma-color-alignment.png","figma-color-review-results.json","figma-color-review-390-light-1.png","figma-color-review-390-light-2.png","figma-color-review-390-dark-1.png","figma-color-review-390-dark-2.png","figma-color-review-320-light-1.png","figma-color-review-320-light-2.png","figma-color-review-320-dark-1.png","figma-color-review-320-dark-2.png","figma-copy-success.png","devtools-together-light.png","devtools-together-dark.png","figma-color-right-light.png","figma-color-right-dark.png","figma-corner-extreme-light.png","figma-corner-extreme-dark.png","devtools-corner-extreme-light.png","devtools-corner-extreme-dark.png","figma-visual-light.png","figma-visual-dark.png","devtools-visual-light.png","devtools-visual-dark.png","devtools-visual-wide-light.png","devtools-visual-wide-dark.png","devtools-font-visual.png","figma-visual-themes-comparison.png","devtools-visual-themes-comparison.png","visual-comparison-layout.json","figma-settings-light.png","figma-settings-dark.png","devtools-settings-light.png","devtools-settings-dark.png","figma-additional-info.png","devtools-additional-info.png","figma-all-unknown.png","figma-all-unsupported.png","devtools-all-unknown.png","devtools-all-unsupported.png","figma-font-results.json","devtools-font-results.json","figma-theme-results.json","devtools-theme-results.json","theme-comparison-layout.json","figma-themes-comparison.png","devtools-themes-comparison.png","figma-theme-light.png","figma-theme-dark.png","figma-theme-light-narrow.png","figma-theme-dark-narrow.png","devtools-theme-light.png","devtools-theme-dark.png","devtools-theme-light-narrow.png","devtools-theme-dark-narrow.png","figma-help-light.png","figma-help-dark.png","devtools-help-light.png","devtools-help-dark.png","figma-statuses.png","figma-icons.json","devtools-icons.json","figma-long-name.png","devtools-long-name.png","figma-presentation.json","devtools-presentation.json","figma-properties.png","devtools-properties.png","navigation-diagnostic-results.json","navigation-diagnostic-traces.json","figma-help.png","devtools-help.png","precision-analysis.json","devtools-precision-regression.png","figma-dark-empty.png", "figma-dark-loading.png", "figma-dark-narrow.png", "browser-results.json", "verification-results.json", "devtools-panel.png", "devtools-results.png", "figma-ui-mock.png", "devtools-empty.png", "devtools-differences.png", "devtools-narrow.png", "plugin-browser-results.json", "figma-connection-complete.png", "figma-no-response.png", "figma-error.png", "figma-copy-manual.png", "devtools-paste.png", "devtools-visual-comparison.png"}
selected = []
for item in sorted(root.rglob("*")):
    if not item.is_file():
        continue
    rel = item.relative_to(root)
    if any(part in {"node_modules", ".git", ".agents", ".codex", "__pycache__", "release"} for part in rel.parts):
        continue
    if item.name.startswith(".env") or item.suffix in {".log", ".pyc"}:
        continue
    if (len(rel.parts) == 1 and item.name in top_files) or rel.parts[0] in top_dirs or (rel.parts[0] == "artifacts" and item.name in evidence):
        selected.append(item)
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for item in selected:
        z.write(item, "figcheck/" + item.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names = z.namelist()
    for required in ["apps/figma-plugin/dist/manifest.json", "apps/figma-plugin/dist/code.js", "apps/figma-plugin/dist/ui.html", "apps/chrome-extension/dist/manifest.json", "apps/chrome-extension/dist/panel.js", "docs/설치-사용.md", "fixtures/sample.json"]:
        assert "figcheck/" + required in names, required
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(release / "FigCheck-MVP-0.3.7.sha256.txt").write_text(digest + "  " + archive.name + "\n", encoding="utf-8")
print(json.dumps({"path": str(archive), "bytes": archive.stat().st_size, "files": len(selected), "sha256": digest}, ensure_ascii=False))
