# Movie Scripts Data Structure

This directory contains the raw movie scripts used for character analysis.

## Expected Files

1. **American Psycho**
   - File: `american_psycho.txt`
   - Character: Patrick Bateman
   - Year: 2000

2. **Fight Club**
   - File: `fight_club.txt`
   - Character: Tyler Durden
   - Year: 1999

3. **The Dark Knight Trilogy**
   - Files: 
     - `batman_begins.txt` (2005)
     - `the_dark_knight.txt` (2008)
     - `the_dark_knight_rises.txt` (2012)
   - Characters: Bruce Wayne/Batman, Bane

4. **Pumping Iron**
   - File: `pumping_iron.txt`
   - Character: Arnold Schwarzenegger
   - Year: 1977

## File Format

Each script file should be in plain text format with standard screenplay formatting:

```
SCENE HEADING

DESCRIPTION
Action description goes here.

CHARACTER NAME
Dialogue goes here.
```

## Processing

These raw scripts will be processed to:
1. Extract character-specific dialogue and scenes
2. Add metadata (character, movie, year, scene context)
3. Split into appropriate chunks for RAG system
4. Store in ../processed/ directory 