"use strict";

const favoriteStorageKey = "table-for-eight.favorites.v1";
const favoriteIds = new Set();
const controls = document.querySelector("#explorer-controls");
const results = document.querySelector("#explorer-results");
const rememberFavorites = document.querySelector("#remember-favorites");
const storageStatus = document.querySelector("#storage-status");

/** Read native control values into a new preference object. Returns the current preferences. */
function readPreferences() {
  return {
    query: document.querySelector("#search").value.trim().toLocaleLowerCase(),
    cuisine: document.querySelector("#cuisine").value,
    maximumPrice: Number(document.querySelector("#price").value),
    minimumRating: Number(document.querySelector("#rating").value),
    order: document.querySelector("#sort").value,
    favoritesOnly: document.querySelector("#favorites-only").checked,
  };
}

/** Select and sort supplied records without mutation.
 * @param {object[]} records Restaurant records to process.
 * @param {object} preferences Search, filters, and ordering choices.
 * @param {Set<number>} favorites Saved IDs used when favoritesOnly is enabled.
 * @returns {object[]} A new ordered array sharing the original record references.
 */
function selectRestaurants(records, preferences, favorites) {
  const matches = records.filter((restaurant) => {
    const searchableText = [
      restaurant.name,
      restaurant.cuisine,
      restaurant.neighborhood,
      ...restaurant.specialties,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      searchableText.includes(preferences.query) &&
      (!preferences.cuisine || restaurant.cuisine === preferences.cuisine) &&
      restaurant.priceRange.length <= preferences.maximumPrice &&
      restaurant.rating >= preferences.minimumRating &&
      (!preferences.favoritesOnly || favorites.has(restaurant.id))
    );
  });
  // Returning zero preserves original order when no ordering is requested.
  return matches.toSorted((first, second) => {
    if (preferences.order === "rating")
      return (
        second.rating - first.rating || first.name.localeCompare(second.name)
      );
    if (preferences.order === "price")
      return (
        first.priceRange.length - second.priceRange.length ||
        first.name.localeCompare(second.name)
      );
    if (preferences.order === "name")
      return first.name.localeCompare(second.name);
    return 0;
  });
}

/** Build a safe restaurant card from a record. Returns a new list item without changing data. */
function createRestaurantCard(restaurant) {
  const card = document.createElement("li");
  card.className = "explorer-card";
  const top = document.createElement("div");
  top.className = "card-top";
  const cuisine = document.createElement("span");
  cuisine.className = "cuisine-tag";
  cuisine.textContent = restaurant.cuisine;
  const rating = document.createElement("span");
  rating.className = "card-rating";
  rating.textContent = `${restaurant.rating.toFixed(1)} / 5`;
  top.append(cuisine, rating);
  const heading = document.createElement("h3");
  heading.textContent = restaurant.name;
  const neighborhood = document.createElement("p");
  neighborhood.className = "card-location";
  neighborhood.textContent = `${restaurant.neighborhood} · ${restaurant.priceRange}`;
  const specialties = document.createElement("p");
  specialties.className = "card-specialties";
  specialties.textContent = restaurant.specialties.join(" · ");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Restaurant details";
  const hours = document.createElement("p");
  hours.textContent = `Hours: ${restaurant.hours}`;
  const phone = document.createElement("p");
  phone.textContent = `Practice phone: ${restaurant.phoneNumber}`;
  details.append(summary, hours, phone);
  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.className = "favorite-button";
  favorite.dataset.restaurantId = String(restaurant.id);
  const saved = favoriteIds.has(restaurant.id);
  favorite.setAttribute("aria-pressed", String(saved));
  favorite.setAttribute(
    "aria-label",
    `${saved ? "Remove" : "Save"} ${restaurant.name} ${saved ? "from" : "to"} favorites`,
  );
  favorite.textContent = saved ? "♥ Saved" : "♡ Save restaurant";
  card.append(top, heading, neighborhood, specialties, details, favorite);
  return card;
}

/** Render the selected records and matching count. Returns undefined; replaces only explorer results. */
function renderExplorer() {
  const selected = selectRestaurants(
    restaurants,
    readPreferences(),
    favoriteIds,
  );
  results.replaceChildren(...selected.map(createRestaurantCard));
  document.querySelector("#explorer-empty").hidden = selected.length !== 0;
  document.querySelector("#explorer-count").textContent =
    `${selected.length} of ${restaurants.length} restaurants · ${favoriteIds.size} saved`;
}

/** Persist IDs only after opt in. Returns undefined; storage failure leaves favorites usable in memory. */
function persistFavorites() {
  if (!rememberFavorites.checked) return;
  try {
    localStorage.setItem(
      favoriteStorageKey,
      JSON.stringify({ version: 1, ids: [...favoriteIds] }),
    );
    storageStatus.textContent =
      "Favorites are remembered on this browser. No information is sent anywhere.";
  } catch {
    storageStatus.textContent =
      "This browser could not save favorites. Your current shortlist still works until you reload.";
  }
}

/** Restore a validated saved shortlist. Returns undefined; ignores malformed or unknown IDs. */
function restoreFavorites() {
  try {
    const stored = localStorage.getItem(favoriteStorageKey);
    if (stored === null) return;
    const parsed = JSON.parse(stored);
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.ids) ||
      parsed.ids.length > restaurants.length ||
      !parsed.ids.every(
        (id) =>
          Number.isInteger(id) &&
          restaurants.some((restaurant) => restaurant.id === id),
      )
    ) {
      storageStatus.textContent =
        "Saved favorites could not be read. Start a new shortlist or enable remembering to replace them.";
      return;
    }
    parsed.ids.forEach((id) => favoriteIds.add(id));
    rememberFavorites.checked = true;
    storageStatus.textContent =
      "Your saved favorites have been restored on this browser.";
  } catch {
    storageStatus.textContent =
      "Saved favorites are unavailable. You can still build a shortlist for this visit.";
  }
}

/** Toggle a known favorite from a card click. Returns undefined; restores focus after card replacement. */
function toggleFavorite(event) {
  const button = event.target.closest("button[data-restaurant-id]");
  if (!button) return;
  const id = Number(button.dataset.restaurantId);
  if (!restaurants.find((restaurant) => restaurant.id === id)) return;
  if (favoriteIds.has(id)) favoriteIds.delete(id);
  else favoriteIds.add(id);
  persistFavorites();
  renderExplorer();
  const replacement = results.querySelector(
    `button[data-restaurant-id="${id}"]`,
  );
  (replacement || document.querySelector("#favorites-only")).focus();
}

/** Reset search, filters, and ordering without clearing favorites. Returns undefined. */
function resetPreferences() {
  controls.reset();
  renderExplorer();
}

/** Apply the storage preference. Returns undefined; turning remembering off removes the saved copy. */
function changeRemembering() {
  if (rememberFavorites.checked) {
    persistFavorites();
    return;
  }
  try {
    localStorage.removeItem(favoriteStorageKey);
    storageStatus.textContent =
      "Remembering is off. Favorites last until you reload.";
  } catch {
    storageStatus.textContent =
      "This browser could not remove its saved copy. Clear site data in your browser to remove it.";
  }
}

// Derive cuisine choices from the collection instead of maintaining a second list.
[...new Set(restaurants.map((restaurant) => restaurant.cuisine))]
  .toSorted()
  .forEach((cuisine) => {
    const option = document.createElement("option");
    option.value = cuisine;
    option.textContent = cuisine;
    document.querySelector("#cuisine").append(option);
  });
controls.addEventListener("input", renderExplorer);
controls.addEventListener("change", renderExplorer);
controls.addEventListener("submit", (event) => event.preventDefault());
results.addEventListener("click", toggleFavorite);
document
  .querySelector("#reset-filters")
  .addEventListener("click", resetPreferences);
document
  .querySelector("#empty-reset")
  .addEventListener("click", resetPreferences);
rememberFavorites.addEventListener("change", changeRemembering);
restoreFavorites();
renderExplorer();
