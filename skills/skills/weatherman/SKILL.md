---
name: 'weatherman'
description: 'Fetches the current weather for one city around the world. Use when the user asks you the current weather somewhere'
---

# Overview

This skill is useful to retrieve the current weather conditions somewhere, based on user needs. The script in './scripts/fetch_weather.py' contains all the necessary code to fetch current weather conditions around the globe.

## How to use

Execute this bash command to run the script. Replce the "$LOCATION" placeholder with the city name the user
specified in the request.

```bash
python ./scripts/fetch_weather.py "$LOCATION"
```

## Rules
- If the user asks you to make a prediction, refuse and explain to him that you are only able to fetch the current weather.
- Do not invent the response. If you cannot retrieve the requested result, stop and show the error to the user.
