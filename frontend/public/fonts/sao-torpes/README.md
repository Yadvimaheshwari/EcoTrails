# São Torpes Font

This directory should contain the São Torpes Free Display Font files.

## Required Files

- `SaoTorpes.woff2` (primary)
- `SaoTorpes.woff` (fallback)

## How to Obtain

São Torpes is a free display font. Download it from one of these sources:

1. **Fontshare**: https://www.fontshare.com/ (search for "Sao Torpes")
2. **Google search**: "São Torpes free font download"

## Installation

1. Download the font files
2. Convert to WOFF2 format if needed (use Font Squirrel or similar)
3. Place the files in this directory:
   - `public/fonts/sao-torpes/SaoTorpes.woff2`
   - `public/fonts/sao-torpes/SaoTorpes.woff`

## Usage

The font is configured in `globals.css`:

```css
@font-face {
  font-family: 'Sao Torpes';
  src: url('/fonts/sao-torpes/SaoTorpes.woff2') format('woff2'),
       url('/fonts/sao-torpes/SaoTorpes.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

And used via the `font-display` class or CSS variable:

```css
h1, h2, h3, .font-display {
  font-family: var(--font-display);
}
```

## Fallback

If the font files are not present, the app will fallback to:
- Georgia (serif)
- System serif fonts

This ensures the app works even without the custom font installed.
