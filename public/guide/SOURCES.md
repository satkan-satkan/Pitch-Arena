# Iskra / Искра: original guide assets

**Current visual direction.** The original five images are restored in the live UI, with contextual pose transitions and motion in `src/guide/Guide.jsx`. The brief SVG-signal revision remains in Git history.

Created for Pitch Arena on 2026-09-29 with the **built-in image generation tool**, not the CLI. Original generated character; no reference to an existing mascot. Transparent PNGs are stored beside this file. No external image provider or API key is needed at runtime.

| Asset | Expression |
| --- | --- |
| [iskra-welcome.png](iskra-welcome.png) | Welcoming wave |
| [iskra-thinking.png](iskra-thinking.png) | Thoughtfully curious |
| [iskra-listening.png](iskra-listening.png) | Attentive listening |
| [iskra-support.png](iskra-support.png) | Reassuring encouragement |
| [iskra-celebrate.png](iskra-celebrate.png) | Joyful celebration |

## Final prompt: welcome (new image)

```text
Use case: stylized-concept. Asset type: transparent game-guide character sprite for Pitch Arena, a tasteful lavender startup pitching game. Create ONE original full-body friendly unicorn mentor named Iskra (Spark), a small cream-white unicorn with a short pale-gold horn, fluffy lavender forelock and tail, dark plum expressive eyes, subtle eyebrows, compact rounded hooves, wearing a simple oversized muted-violet hoodie with a tiny four-point spark emblem. Premium soft 3D clay illustration, polished matte surfaces, warm studio lighting, gentle personality, grown-up indie game aesthetic rather than baby toy. Framing: centered single character, three-quarter front view, entire body including ears horn and hooves visible, generous 12% transparent margin, square canvas. Emotion WELCOME: open warm smile, one hoof raised in a small welcoming wave, other hoof relaxed. Recognizable consistent facial features and outfit for future emotional variants. Genuine transparent alpha background, no floor plane, no cast shadow outside character, no scenery, no lettering, no text, no watermark. Do not resemble an existing mascot.
```

## Final prompts: listening, support, celebrate

Each is an image edit referencing the generated welcome image. The actual prompt concatenates the common prefix, the corresponding expression, and the common suffix below, separated by a space.

Prefix:

```text
Use case: identity-preserve. Edit the reference into ONE new emotion sprite for the same original unicorn guide Iskra.
```

Listening:

```text
LISTENING: calm focused eyes looking toward the viewer, ears attentive, closed gentle neutral smile, both front hooves relaxed together at chest level. Quiet attentive posture. No headphones or extra objects.
```

Support:

```text
SUPPORT: empathetic reassuring expression, soft eyebrows and warm modest smile, one front hoof resting over heart and the other open invitingly. Encouraging rather than sad or disappointed.
```

Celebrate:

```text
CELEBRATE: delighted broad smile, joyful crescent eyes, both front hooves raised up in celebration. Keep grounded full-body pose, no jumping, no confetti or other objects.
```

Suffix:

```text
Preserve exact cream-white character identity, gold horn, lavender mane and tail, plum eyes, violet hoodie with gold spark emblem, same limbs, proportions, rendering style and lighting. Keep complete full body, centered square composition, same scale with 10% clear margin around all extremities. Change only expression and front-hoof pose. Genuine transparent alpha background. No floor, no background, no text, no watermark.
```

## Final prompt: thinking

Image edit referencing the welcome image:

```text
Create an emotion variation of this exact unicorn mascot on a transparent background, preserving the original alpha-background style. Same full body, hoodie, golden horn, lavender hair, purple eyes, proportions and studio rendering. Make the mascot thoughtfully curious: mouth closed, eyes looking up and to one side, one front hoof touching the chin. Keep the other front hoof lowered. The output must have a genuinely transparent background. No backdrop, no scenery, no floor, no shadows outside the character, no text. Square centered full-body sprite.
```

## Verification

All five final assets have an alpha channel and transparent corners, checked in the browser test. Visually inspected in the landing page, introduction and mobile interface. Discarded variants are not included. No raster postprocessing was used.
