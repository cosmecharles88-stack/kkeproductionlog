
  function setCityFromGooglePlace(place, cityFieldId) {
    const cityField = cityFieldId
      ? document.getElementById(cityFieldId)
      : document.querySelector('select[name="city"]');
    if (!cityField || !Array.isArray(place.addressComponents)) return;

    let city = "";
    place.addressComponents.forEach(component => {
      if (component.types.includes("locality")) city = component.longText;
      if (!city && component.types.includes("sublocality")) city = component.longText;
      if (!city && component.types.includes("administrative_area_level_3")) city = component.longText;
    });
    if (!city) return;

    if (cityField.tagName === "SELECT") {
      const matchingOption = Array.from(cityField.options).find(option =>
        option.value.toLowerCase() === city.toLowerCase()
      );
      cityField.value = matchingOption ? matchingOption.value : "Other";
    } else {
      cityField.value = city;
    }
  }

  async function mountKKEAddressAutocomplete(inputId, options = {}) {
    const addressInput = document.getElementById(inputId);
    if (!addressInput || addressInput.googleAutocompleteWidget) return;

    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ["us"],
      placeholder: addressInput.placeholder || "Start typing an address"
    });

    autocomplete.id = `${inputId}Autocomplete`;
    autocomplete.value = addressInput.value || "";
    autocomplete.style.display = "block";
    autocomplete.style.width = "100%";
    addressInput.type = "hidden";
    addressInput.insertAdjacentElement("afterend", autocomplete);
    addressInput.googleAutocompleteWidget = autocomplete;

    autocomplete.addEventListener("input", () => {
      addressInput.value = autocomplete.value || "";
    });

    autocomplete.addEventListener("gmp-select", async event => {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "location", "id", "addressComponents"]
      });

      const formattedAddress = place.formattedAddress || autocomplete.value || addressInput.value;
      autocomplete.value = formattedAddress;
      addressInput.value = formattedAddress;

      if (options.captureLocation && place.location) {
        const addressLat = document.getElementById("addressLatitude");
        const addressLng = document.getElementById("addressLongitude");
        const placeId = document.getElementById("googlePlaceId");
        if (addressLat) addressLat.value = place.location.lat().toFixed(6);
        if (addressLng) addressLng.value = place.location.lng().toFixed(6);
        if (placeId) placeId.value = place.id || "";
      }

      setCityFromGooglePlace(place, options.cityFieldId);
    });

    addressInput.form?.addEventListener("reset", () => {
      setTimeout(() => {
        autocomplete.value = addressInput.value || "";
      }, 0);
    });
  }

  window.setKKEAddressAutocompleteValue = function (inputId, value) {
    const addressInput = document.getElementById(inputId);
    if (!addressInput) return;
    addressInput.value = value || "";
    if (addressInput.googleAutocompleteWidget) {
      addressInput.googleAutocompleteWidget.value = value || "";
    }
  };

  window.initKKEAddressAutocomplete = async function () {
    try {
      await Promise.all([
        mountKKEAddressAutocomplete("jobAddress", { captureLocation: true }),
        mountKKEAddressAutocomplete("editAddress", { cityFieldId: "editCity" })
      ]);
    } catch (error) {
      console.error("Google address suggestions could not be initialized:", error);
    }
  };
