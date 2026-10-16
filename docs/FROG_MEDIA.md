# Frog Chorus media: provenance and verification

Every photo and Play control on `/frog-chorus` is backed by an entry in `data/frog-media.json`
(source, creator, licence, original URL, SHA-256, size, dimensions, duration).
`npm run test:frog-media` fails if a file is missing, altered, mis-keyed, unlicensed, silent or too large.
`npm run test:frog-browser` (Playwright, real server) checks playback, one-at-a-time, pause/replay,
errors, filters, photos and layout at phone and desktop widths.

## Recordings (13 of 13 hosted)
| Species | Source | Licence |
|---|---|---|
| Wood frog, western chorus frog, northern spring peeper, northern leopard frog, eastern American toad, eastern gray treefrog, Cope's gray treefrog, green frog, American bullfrog, mink frog, Blanchard's cricket frog | [USGS ARMI Frog and Toad Calls](https://www.umesc.usgs.gov/terrestrial/amphibians/armi/frog_calls.html) MP3 files linked from that page | Public domain (U.S. Government work) |
| Pickerel frog | iNaturalist observation 345646982, recorded by Kent P. McFarland, Bath County, VA | CC0 |
| Fowler's toad | iNaturalist observation 278385516, recorded by Moxie C., Richmond, VA | CC BY 4.0 |

Why not the Michigan DNR files: the DNR's 13-species zip is State of Michigan material (ID3 "Engineer: State of Michigan",
2014) published for learning with no redistribution grant, so it is linked, not re-hosted. The USGS Patuxent Frog Call Quiz
was also ruled out: its acknowledgements say the sound files are copyright-protected (mostly Lang Elliott, NatureSound Studio).

How the two iNaturalist calls were chosen: all research-grade CC0/CC-BY sound observations were ranked by how far the
species' call band stands above background (pickerel 0.7-1.8 kHz pulsed snores; Fowler's 1.7-2.6 kHz nasal buzz).
Finalists needed unanimous current identifications and were checked on spectrograms for the expected call shape
(pickerel: discrete ~1 s pulsed snores; Fowler's: a single ~1 s rapidly pulsed buzz, unlike the American toad's long trill).
Recordings dominated by other species (for example spring peepers) were rejected.

All 11 USGS files were also checked against their expected signatures (peeper single rising notes near 3 kHz,
American toad continuous trill, gray vs Cope's slow vs fast pulsed trills, bullfrog low repeated notes, cricket frog clicks).

Processing: every call is loudness-levelled to about -19 LUFS (the USGS originals ranged from -38 to -4 LUFS), mono 112 kbps
MP3, metadata stripped. Call content is not edited or trimmed. Originals are linked in the manifest.

## Photographs (13 of 13)
12 are iNaturalist research-grade observations with no dissenting identifications, licensed CC0 or CC BY 4.0 and credited
to the photographer; 1 (eastern gray treefrog, a calling male) is the USGS ARMI species photograph, public domain.
Eastern gray and Cope's gray treefrogs cannot be told apart by sight, so their photos come from observations identified by
call (USGS, and an iNaturalist observation that includes a sound recording). Each photo was inspected by eye for the
species' field marks, cropped to 4:3 and saved as WebP (1200x900 max, plus a 560x420 version).

## Sensitive species
Blanchard's cricket frog (threatened), Fowler's toad and pickerel frog (special concern): no Michigan localities are shown,
the media come from out-of-state observations, and the manifest stores no coordinates or place names for them.

## Gaps
None for this release. If a file ever has to be removed, delete its manifest entry: the card shows an honest
"No verified photo yet" or "No verified recording" state instead of a substitute species.
