import requests
import json
from pathlib import Path
from typing import Dict, Any, Optional
from urllib.parse import urlencode

# Constants
CLIENT_VERSION = "349f8adcd116f237fa5fb2ad345cc664b1a60659"  # Updated client version
BASE_URL = "https://elements.envato.com/data-api/page/items-neue-page"

# Add browser-like headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://elements.envato.com',
    'Referer': 'https://elements.envato.com/',
}

# Categories from the TypeScript file
CATEGORIES = [
    "photos",
    "stock-video",
    "audio",
    "graphics",
    "3d",
    "fonts",
    "video-templates",
    "graphic-templates"
]

def fetch_refinements(category: str) -> Optional[Dict[str, Any]]:
    """
    Fetch refinements data for a specific category.
    
    Args:
        category: The category to fetch refinements for
        
    Returns:
        Dictionary containing refinements data or None if request fails
    """
    # Modified to match the working URL format with trailing slash
    params = {
        "path": f"/{category}/",  # Added trailing slash
        "languageCode": "en",
        "clientVersion": CLIENT_VERSION
    }
    
    try:
        url = f"{BASE_URL}?{urlencode(params)}"
        print(f"Fetching URL: {url}")
        
        # Added headers to the request
        response = requests.get(BASE_URL, params=params, headers=HEADERS)
        response.raise_for_status()
        
        data = response.json()
        
        # Print the first level of response for debugging
        print(f"Response keys: {data.keys()}")
        
        # Navigate to refinements data using the correct path
        refinements = (
            data.get('data', {})
            .get('data', {})
            .get('refinements', {})
            .get('data', {})
        )
        
        if not refinements:
            print(f"Warning: No refinements found for {category}")
            # Print the data structure for debugging
            print(f"Data structure: {json.dumps(data, indent=2)[:500]}...")
            
        return refinements
    
    except requests.RequestException as e:
        print(f"Error fetching data for {category}: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON for {category}: {str(e)}")
        return None

def save_refinements() -> None:
    """Fetch and save refinements for all categories."""
    # Create output directory
    output_dir = Path("envato_refinements")
    output_dir.mkdir(exist_ok=True)
    
    for category in CATEGORIES:
        print(f"\n{'='*50}")
        print(f"Processing category: {category}")
        print(f"{'='*50}")
        
        refinements = fetch_refinements(category)
        
        if refinements:
            # Save to JSON file
            output_file = output_dir / f"{category}_refinements.json"
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(refinements, f, indent=2, ensure_ascii=False)
                print(f"✓ Successfully saved refinements for {category} to {output_file}")
            except IOError as e:
                print(f"Error saving file for {category}: {str(e)}")
        else:
            print(f"✗ No refinements data saved for {category}")

if __name__ == "__main__":
    print("Starting refinements extraction...")
    save_refinements()
    print("\nRefinements extraction complete!")
