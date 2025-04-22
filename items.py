import requests
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
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

# Envato categories to fetch
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

def fetch_items_for_category(category: str, query: str = "Blue", page: int = 1) -> Dict[str, Any]:
    """
    Fetch items for a specific category with the given search query.
    
    Args:
        category: The Envato category (photos, stock-video, etc.)
        query: The search query (default: "Blue")
        page: Page number for pagination (default: 1)
        
    Returns:
        API response as a dictionary
    """
    # Construct the path
    path = f"/{category}/{query.lower()}"
    
    # Build query parameters
    params = {
        "path": path,
        "languageCode": "en",
        "clientVersion": CLIENT_VERSION,
        "page": str(page)
    }
    
    # Make the request
    url = f"{BASE_URL}?{urlencode(params)}"
    print(f"Fetching items for category '{category}' with query '{query}' from URL: {url}")
    
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code != 200:
        print(f"Error fetching data for {category}: {response.status_code}")
        return {"error": f"HTTP error {response.status_code}"}
    
    try:
        return response.json()
    except json.JSONDecodeError:
        print(f"Error decoding JSON for {category}")
        return {"error": "JSON decode error"}

def analyze_item_schema(item: Dict[str, Any]) -> Dict[str, str]:
    """
    Analyze the schema of an item by determining the type of each field.
    
    Args:
        item: A single item from the API response
        
    Returns:
        Dictionary mapping field names to their types
    """
    schema = {}
    for key, value in item.items():
        if value is None:
            schema[key] = "null"
        else:
            schema[key] = type(value).__name__
    return schema

def save_results(results: Dict[str, Any], filename: str):
    """
    Save the results to a JSON file.
    
    Args:
        results: Results to save
        filename: Filename to save to
    """
    output_dir = Path("envato_schema")
    output_dir.mkdir(exist_ok=True)
    
    with open(output_dir / filename, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    
    print(f"Saved results to {output_dir / filename}")

def main():
    """
    Main function to fetch and analyze items for all categories.
    """
    # Create directory for output files
    Path("envato_schema").mkdir(exist_ok=True)
    
    all_schemas = {}
    
    # Process each category
    for category in CATEGORIES:
        print(f"Processing category: {category}")
        
        # Fetch items
        response = fetch_items_for_category(category)
        
        # Save full response for reference
        save_results(response, f"{category}_full_response.json")
        
        # Extract items if available
        items = []
        if "data" in response and "data" in response["data"] and "items" in response["data"]["data"]:
            items = response["data"]["data"]["items"]
            print(f"Found {len(items)} items for category '{category}'")
            
            # Save a sample item
            if items:
                save_results(items[0], f"{category}_sample_item.json")
                
                # Analyze schema for first item
                item_schema = analyze_item_schema(items[0])
                all_schemas[category] = item_schema
        else:
            print(f"No items found for category '{category}'")
    
    # Save combined schema information
    save_results(all_schemas, "all_categories_schema.json")
    print("Schema analysis complete!")

if __name__ == "__main__":
    main()
