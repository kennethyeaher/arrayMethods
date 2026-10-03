"use strict";

// Keep the supplied restaurant records as the shared source for every view.
const restaurants = [
    {
        "id": 1,
        "name": "Milano's Italian Restaurant",
        "cuisine": "Italian",
        "rating": 4.5,
        "priceRange": "$$",
        "neighborhood": "College Park",
        "hours": "11am-10pm",
        "specialties": ["pasta", "pizza"],
        "phoneNumber": "(301) 555-0123"
    },
    {
        "id": 2,
        "name": "Sakura Sushi",
        "cuisine": "Japanese",
        "rating": 4.2,
        "priceRange": "$$$",
        "neighborhood": "Downtown",
        "hours": "5pm-11pm",
        "specialties": ["sushi", "ramen"],
        "phoneNumber": "(301) 555-0456"
    },
    {
        "id": 3,
        "name": "Border Café",
        "cuisine": "Mexican",
        "rating": 4.0,
        "priceRange": "$",
        "neighborhood": "University District",
        "hours": "10am-12am",
        "specialties": ["tacos", "burritos"],
        "phoneNumber": "(301) 555-0789"
    },
    {
        "id": 4,
        "name": "The Brass Elephant",
        "cuisine": "American",
        "rating": 4.8,
        "priceRange": "$$$$",
        "neighborhood": "Historic District",
        "hours": "5pm-10pm",
        "specialties": ["steaks", "seafood"],
        "phoneNumber": "(301) 555-0012"
    },
    {
        "id": 5,
        "name": "Pho Corner",
        "cuisine": "Vietnamese",
        "rating": 4.3,
        "priceRange": "$",
        "neighborhood": "College Park",
        "hours": "11am-9pm",
        "specialties": ["pho", "banh mi"],
        "phoneNumber": "(301) 555-0345"
    },
    {
        "id": 6,
        "name": "Tandoor Palace",
        "cuisine": "Indian",
        "rating": 4.1,
        "priceRange": "$$",
        "neighborhood": "Downtown",
        "hours": "12pm-10pm",
        "specialties": ["curry", "naan"],
        "phoneNumber": "(301) 555-0678"
    },
    {
        "id": 7,
        "name": "Le Petit Bistro",
        "cuisine": "French",
        "rating": 4.6,
        "priceRange": "$$$",
        "neighborhood": "Historic District",
        "hours": "6pm-10pm",
        "specialties": ["wine", "cheese"],
        "phoneNumber": "(301) 555-0901"
    },
    {
        "id": 8,
        "name": "Seoul Kitchen",
        "cuisine": "Korean",
        "rating": 4.4,
        "priceRange": "$$",
        "neighborhood": "University District",
        "hours": "11am-11pm",
        "specialties": ["bbq", "kimchi"],
        "phoneNumber": "(301) 555-0234"
    }
];

/** Create a restaurant row without interpreting the data as HTML.
 * @param {object} restaurant A supplied restaurant record.
 * @param {boolean} showDetails Whether to include price and rating.
 * @returns {HTMLLIElement} A new list item; the record is unchanged.
 */
function createRestaurantRow(restaurant, showDetails = false) {
  const row = document.createElement("li");
  row.className = "restaurant-item";
  const name = document.createElement("strong");
  name.className = "restaurant-name";
  name.textContent = restaurant.name;
  const cuisine = document.createElement("span");
  cuisine.className = "restaurant-cuisine";
  cuisine.textContent = restaurant.cuisine;
  row.append(name, cuisine);
  if (showDetails) {
    const details = document.createElement("span");
    details.className = "restaurant-details";
    details.textContent = `${restaurant.priceRange} · ${restaurant.rating.toFixed(1)} / 5`;
    row.append(details);
  }
  return row;
}

/** Display every name and cuisine using forEach. Returns undefined. */
function displayAllRestaurants() {
  const list = document.createElement("ul");
  list.className = "restaurant-list";
  restaurants.forEach((restaurant) => {
    list.append(createRestaurantRow(restaurant));
  });
  document.querySelector("#restaurant-list").replaceChildren(list);
}

/** Select the $ and $$ records with filter, then render a new list. Returns undefined. */
function displayAffordableRestaurants() {
  const affordableRestaurants = restaurants.filter((restaurant) => {
    return restaurant.priceRange === "$" || restaurant.priceRange === "$$";
  });
  const list = document.createElement("ul");
  list.className = "restaurant-list";
  affordableRestaurants.forEach((restaurant) => {
    list.append(createRestaurantRow(restaurant, true));
  });
  const region = document.querySelector("#filtered-list");
  if (affordableRestaurants.length === 0) {
    region.textContent = "No restaurants match $ or $$.";
    return;
  }
  region.replaceChildren(list);
}

/** Map the records to name strings and display a semantic list. Returns undefined. */
function displayRestaurantNames() {
  const names = restaurants.map((restaurant) => {
    return restaurant.name;
  });
  const list = document.createElement("ul");
  list.className = "name-list";
  names.forEach((name) => {
    const row = document.createElement("li");
    row.textContent = name;
    list.append(row);
  });
  document.querySelector("#mapped-list").replaceChildren(list);
}

/** Find the first exact 4.8 rating and render it or a missing result. Returns undefined. */
function displayFeaturedRestaurant() {
  const featuredRestaurant = restaurants.find((restaurant) => {
    return restaurant.rating === 4.8;
  });
  const region = document.querySelector("#found-item");
  if (!featuredRestaurant) {
    region.textContent = "No restaurant has a rating of 4.8.";
    return;
  }
  const list = document.createElement("ul");
  list.className = "restaurant-list featured-list";
  list.append(createRestaurantRow(featuredRestaurant, true));
  region.replaceChildren(list);
}

// The existing starter controls keep each array method independently testable.
document.querySelector("#display-button").addEventListener("click", displayAllRestaurants);
document.querySelector("#filter-button").addEventListener("click", displayAffordableRestaurants);
document.querySelector("#map-button").addEventListener("click", displayRestaurantNames);
document.querySelector("#find-button").addEventListener("click", displayFeaturedRestaurant);
