# Processed Character Data

This directory contains the processed character data extracted from movie scripts.

## Directory Structure

```
processed/
├── patrick_bateman/
│   ├── dialogue.json       # Character dialogue with metadata
│   ├── monologues.json    # Character monologues/narration
│   └── scenes.json        # Key scenes with character
├── tyler_durden/
│   ├── dialogue.json
│   ├── monologues.json
│   └── scenes.json
├── bruce_wayne/
│   ├── dialogue.json
│   ├── monologues.json
│   └── scenes.json
├── bane/
│   ├── dialogue.json
│   ├── monologues.json
│   └── scenes.json
└── arnold/
    ├── dialogue.json
    ├── monologues.json
    └── scenes.json
```

## JSON Format

### dialogue.json
```json
{
  "dialogues": [
    {
      "text": "Character's dialogue",
      "metadata": {
        "character": "Character Name",
        "movie": "Movie Title",
        "year": "Year",
        "scene_context": "Description of scene",
        "emotion": "Character's emotional state",
        "speaking_to": "Other character in scene",
        "scene_location": "Where the scene takes place"
      }
    }
  ]
}
```

### monologues.json
```json
{
  "monologues": [
    {
      "text": "Character's monologue",
      "metadata": {
        "character": "Character Name",
        "movie": "Movie Title",
        "year": "Year",
        "type": "narration/internal/speech",
        "context": "Context of monologue",
        "themes": ["theme1", "theme2"]
      }
    }
  ]
}
```

### scenes.json
```json
{
  "scenes": [
    {
      "description": "Scene description",
      "metadata": {
        "character": "Character Name",
        "movie": "Movie Title",
        "year": "Year",
        "location": "Scene location",
        "other_characters": ["character1", "character2"],
        "significance": "Why this scene is important"
      }
    }
  ]
}
```

This structured format will allow our RAG system to:
1. Easily retrieve relevant character information
2. Maintain context for responses
3. Generate more authentic character interactions
4. Provide source attribution for responses 