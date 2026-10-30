import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://api.weatherapi.com/v1/current.json"
api_key = "6d868dbc60fb4c2889f120802262910"

def get_weather(place: str) -> dict:
    if not api_key:
        raise RuntimeError("Variabile d'ambiente WEATHER_API_KEY non impostata")

    # urlencode gestisce spazi e caratteri speciali (es. "New York", "Forlì")
    query = urllib.parse.urlencode({"key": api_key, "q": place})
    url = f"{BASE_URL}?{query}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        # l'API restituisce un JSON con la descrizione dell'errore nel body
        try:
            detail = json.load(e).get("error", {}).get("message", e.reason)
        except Exception:
            detail = e.reason
        raise RuntimeError(f"Errore API ({e.code}): {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Errore di rete: {e.reason}") from e


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(f'Uso: python {sys.argv[0]} "<luogo>"')

    place = " ".join(sys.argv[1:])  # permette anche: script.py New York

    try:
        data = get_weather(place)
    except RuntimeError as e:
        sys.exit(str(e))

    loc = data["location"]
    cur = data["current"]
    print(f'{loc["name"]}, {loc["country"]}')
    print(f'{cur["condition"]["text"]}, {cur["temp_c"]}°C (percepita {cur["feelslike_c"]}°C)')
    print(f'Umidità: {cur["humidity"]}%  Vento: {cur["wind_kph"]} km/h')


if __name__ == "__main__":
    main()