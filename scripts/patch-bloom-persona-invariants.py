from pathlib import Path

p = Path('scripts/check-bloom-tracker-product.mjs')
text = p.read_text()
old = "assert.ok(page.includes('wavePath'), 'map must support geographic bloom progression when zone evidence exists');"
new = "assert.ok(page.includes('waveEntry.zoneStatus.map'), 'map must support geographic bloom progression with geolocated zone points when evidence exists');"
if text.count(old) != 1:
    raise SystemExit('expected old wavePath invariant exactly once')
text = text.replace(old, new, 1)
old2 = "assert.ok(page.includes('Read the year across the map:'), 'off-season map must explain how to interpret April-to-June movement');"
new2 = "assert.ok(page.includes('Read the year across the map:'), 'off-season map must explain how to interpret the April-to-September flower season');"
if text.count(old2) == 1:
    text = text.replace(old2, new2, 1)
p.write_text(text)
print('Bloom persona invariants aligned with point-based progression.')
