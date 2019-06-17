CURRENT_SERVICE_ID = {};
let TRIP_PAX = [];
let CURRENT_PAGE = 1;
let dayHeight = 240; // height of the "day" element
let hourHeight = dayHeight / 24; // height of the day divided by 24 (number of hours in day)
let minuteHeight = hourHeight / 60;
let searchDataTable = {};
let tripRangeDatePicker = {};
let currentPlace = {};
let dateFormat = "YYYY-MM-DD 00:00:00";
let builderMode = getQueryVariable("mode");

/**
 * Auto save object which holds all the functionality to autosave bookings.
 * This functionality is only used on bookings and not on packages (requirement may change in future).
 */
var AutoSave = (function(autoSave) {
  let timer = null;
  let storageSlotName = "autosave";
  function getCurrentTrip() {
    return currentBookingState;
  }

  function saveState() {
    let currentBooking = tripBuilder.GetFullBooking();
    if (currentBooking.itinerary.length > 0 || currentBooking.hasOwnProperty("roomConfig")) {
      let currentBookingState = JSON.stringify(currentBooking);
      localStorage.setItem(storageSlotName, currentBookingState);
    }
  }

  autoSave.setSlotName = function(name) {
    storageSlotName = name;
  };

  autoSave.start = function(interval = 10000) {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
    timer = setInterval(saveState, interval);
  };

  autoSave.stop = function() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  autoSave.saveState = function() {
    saveState();
  };

  autoSave.clear = function() {
    localStorage.removeItem(storageSlotName);
  };

  if (typeof exports === "object") {
    module.exports = autoSave;
  }
  return autoSave;
})(AutoSave || {});

/**
 * UI state object used to manage the state across multiple views
 */
let UI = mobx.observable({
  activeTab: "accommodation",
  currentView: "day-view",
  previousView: "",
  tabs: mobx.observable.array(
    [
      "accommodation",
      "meet-greet",
      "excursion",
      "transfer",
      "car-rental",
      "meal",
      "day-pass",
      "entrance-fee",
      "flight",
      "own-arrangement"
    ],
    {deep: false}
  ),
  currentCostRooms: mobx.observable.array([], {deep: false}),
  currentCostPax: mobx.observable.array([], {deep: false}),
  currentCostRoomsAndPax: mobx.observable.array([], {deep: false}),
  currentDay: {},
  currentService: {
    supplierName: "",
    supplierId: 0,
    productId: 0,
    productDescription: "",
    address: "",
    optionData: mobx.observable.ref({}),
    rates: mobx.observable.array([], {deep: false}),
    costBreakDown: mobx.observable.array([], {deep: false})
  },
  paxConfig: {
    isDirty: false,
    newRoom: {
      adults: 0,
      children: 0,
      infants: 0
    },
    newRooms: mobx.observable.array([], {deep: false}),
    nextRoomId: 1
  },
  currentRoom: {
    isNewRoom: false,
    isUpdate: false,
    roomId: 0
  },
  resetCurrentRoom: function() {
    this.currentRoom = {
      isNewRoom: false,
      isUpdate: false,
      roomId: 0
    };
  },
  resetNewRoom: function() {
    this.paxConfig.newRoom.adults = 0;
    this.paxConfig.newRoom.children = 0;
    this.paxConfig.newRoom.infants = 0;
  },
  clearCurrentService: function() {
    this.currentService = {
      supplierName: "",
      supplierId: 0,
      productId: 0,
      productDescription: "",
      address: "",
      optionData: mobx.observable.ref({}),
      rates: mobx.observable.array([], {deep: false}),
      costBreakDown: mobx.observable.array([], {deep: false})
    };
  }
});

let BookingState = mobx.observable({
  costingTotals: mobx.observable.array([], {deep: false}),
  clearCostingTable: function() {
    this.costingTotals = mobx.observable.array([], {deep: false});
  },
  isExistingBooking: false,
  existingReferenceNumber: null
});

/**
 * Object containing colours for each service line.
 * The name must correspond with the name given to the in the data-tabname attribute.
 */
let serviceColours = {
  "meet-greet": "orange",
  accommodation: "purple",
  "car-rental": "blue",
  excursion: "green",
  transfer: "light-orange",
  "day-pass": "lilac",
  "entrance-fee": "lilac",
  flight: "blue",
  meal: "brown",
  "own-arrangement": "blue"
};

$(function() {
  // Set the initial tab to "accommodation" when the page opens.
  var activeTab = "accommodation";
  /**
   * Load the booking notes sidebar form, find a better solution for this later on.
   */
  loadSidebarNotesForm();
  let referenceNumber = getQueryVariable("ref");
  let action = getQueryVariable("action");
  let newStartDateQuery = getQueryVariable("startDate");
  let mode = getQueryVariable("mode");
  if (referenceNumber !== false) {
    BookingState.isExistingBooking = true;
    BookingState.existingReferenceNumber = referenceNumber;

    $.ajax({
      type: "POST",
      url: "/tripbuilder/loadBooking",
      data: {booking_reference: referenceNumber},
      dataType: "json",
      success: function(existingBooking) {
        tripBuilder.ClearItinerary();
        tripBuilder.SetTotalBudget(existingBooking.booking.budget);
        let startDate = moment(existingBooking.booking.travel_date);
        let endDate = moment(existingBooking.booking.departure_date);
        let diff = 0;
        let diffBetweenStartDates = 0;

        let itineraryForRender = [];
        diff = endDate.diff(startDate, "days");
        tripBuilder.SetTotalDays(diff);

        if (action == "duplicate" && newStartDateQuery !== false) {
          newStartDateQuery += " 00:00:00";
          let proposedStartDate = moment(newStartDateQuery);
          diffBetweenStartDates = proposedStartDate.diff(startDate, "days");
          startDate = moment(newStartDateQuery);
          endDate = moment(newStartDateQuery).add(diff, "d");
          itineraryForRender = renderDuplicateBooking(existingBooking, diffBetweenStartDates);
        } else {
          itineraryForRender = renderBookingForEditing(existingBooking);
        }

        /**
         * Update the trip date range control.
         */
        let dateRange = $("#trip-date-range").data("daterangepicker");
        // dateRange.setMinDate(startDate.toDate());
        dateRange.setStartDate(startDate.toDate());
        dateRange.setEndDate(endDate.toDate());

        tripBuilder.SetStartDate(startDate.clone());
        tripBuilder.SetEndDate(endDate.clone());
        $("#booking-notes-text").val(tripBuilder.GetBookingNotes());
        renderTripDays(startDate, endDate);
        renderItinerary(itineraryForRender);
        $("");
        if (tripBuilder.GetTotalBudget() > 0) {
          renderBudgetTotals();
          renderThermometer();
        }
      }
    });
  } else {
    // if (builderMode == false) {
    /**
     * Check if there are any autosaves
     */
    if (localStorage.hasOwnProperty("autosave")) {
      let autoSaveBooking = JSON.parse(localStorage.getItem("autosave"));
      let bookingName = autoSaveBooking.tripInfo.partyName;
      let agentName = autoSaveBooking.agent;
      let serviceCount = 0;
      if (autoSaveBooking.hasOwnProperty("itinerary")) {
        serviceCount = autoSaveBooking.itinerary.length;
      }
      let autoSaveHtml = `<table class="table table-bordered">`;
      autoSaveHtml += `<tr><td><strong>Party name</strong></td><td>${bookingName}</td></tr>`;
      autoSaveHtml += `<tr><td><strong>Agent</strong></td><td>${agentName}</td></tr>`;
      autoSaveHtml += `<tr><td><strong>Service count</strong></td><td>${serviceCount}</td></tr>`;
      autoSaveHtml += `</table>`;
      $("#autosave-recover-information").html(autoSaveHtml);
      $("#modal-autosave-recover").modal("show");
    }

    /**
     *  Start the auto save functionality
     */
    AutoSave.start(60000);
    // }
  }

  /**
   * Main date range picker used to select the trip start and end dates.
   * Once the date range has been selected, generate day trip day blocks for each day in the date range.
   */
  tripRangeDatePicker = $("#trip-date-range").daterangepicker(
    {
      opens: "left",

      locale: {
        format: "D MMMM YYYY",
        applyLabel: "Select date range"
      },
      minDate: moment().toDate()
    },
    function(start, end, label) {
      let startDate = moment(start).clone();
      let endDate = moment(end).clone();
      if (tripBuilder.Itinerary().length > 0) {
        let outOfRangeServices = [];

        for (const i of tripBuilder.Itinerary()) {
          let serviceStartDate = moment(i.startDate);
          let serviceEndDate = moment(i.endDate);
          if (
            serviceStartDate.isBetween(startDate, endDate, null) == false ||
            serviceEndDate.isBetween(startDate, endDate, null) == false
          ) {
            outOfRangeServices.push(i.serviceId);
          }
        }
        if (outOfRangeServices.length > 0) {
          let answer = confirm(
            "By changing your date range some services will be deleted.\r\n\r\nAre you sure you'd like to proceed?"
          );
          if (answer == true) {
            for (let index = 0; index < outOfRangeServices.length; index++) {
              tripBuilder.RemoveService(outOfRangeServices[index]);
            }
            const existingItinerary = tripBuilder.Itinerary();
            tripBuilder.ClearItinerary();
            renderTripDays(startDate, endDate);
            renderItinerary(existingItinerary);
          } else {
            return;
          }
        } else {
          const existingItinerary = tripBuilder.Itinerary();
          tripBuilder.ClearItinerary();
          renderTripDays(startDate, endDate);
          renderItinerary(existingItinerary);
        }
      } else {
        renderTripDays(startDate, endDate);
      }

      if (tripBuilder.GetTotalBudget() > 0) {
        renderBudgetTotals();
        renderThermometer();
      }
    }
  );

  /**
   * date range picker template patch start
   */
  $(
    "#trip-date-range, .single-datepicker, .single-car-datepicker, .single-flight-datepicker, .daterange-datepicker-with-time, .daterange-datepicker, #package-valid-date-range"
  ).focus(function() {
    $(".daterangepicker").addClass("g-bg-teal g-bubble-arrow");
    $(".right>.calendar-table").addClass("g-bg-none g-bord-0 g-colo-wh");
    $(".left>.calendar-table").addClass("g-bg-none g-bord-0 g-colo-wh");
    $(".drp-buttons").addClass("g-bg-lteal g-colo-wh");
    $(".applyBtn").addClass("g-bg-teal g-border-shadow i-btn");
    $(".next").addClass("g-next-colo-wh");
  });
  /**
   * date range picker template patch end
   */

  /**
   * date range picker template patch start
   */
  $(
    "#trip-date-range, .single-datepicker, .single-car-datepicker, .daterange-datepicker-with-time, .daterange-datepicker"
  ).focus(function() {
    $(".daterangepicker").addClass("g-bg-teal g-bubble-arrow");
    $(".right>.calendar-table").addClass("g-bg-none g-bord-0 g-colo-wh");
    $(".left>.calendar-table").addClass("g-bg-none g-bord-0 g-colo-wh");
    $(".drp-buttons").addClass("g-bg-lteal g-colo-wh");
    $(".applyBtn").addClass("g-bg-teal g-border-shadow i-btn");
    $(".next").addClass("g-next-colo-wh");
  });
  /**
   * date range picker template patch end
   */

  if (builderMode == "packagebuilder") {
    $("#package-valid-date-range").daterangepicker({
      opens: "left",
      locale: {
        format: "D MMMM YYYY",
        applyLabel: "Select date range"
      }
    });
  }

  /**
   * Auto complete function used when a user starts to type in a supplier name
   * in the "Supplier" text field.
   */
  $(".supplier-search").autocomplete({
    serviceUrl: "/tripbuilder/supplierSearch",
    onSelect: function(suggestion) {
      var serviceType = $("#" + activeTab + "-supplier").data("servicetype");
      let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");

      let startDate = {};
      let endDate = {};
      let status = $("#" + activeTab + "-service-status").val();

      if (activeTab == "car-rental" || activeTab == "flight") {
        let pickupDate = $("#" + activeTab + "-pick-up-time").data("daterangepicker");
        let dropOffDate = $("#" + activeTab + "-drop-off-time").data("daterangepicker");
        startDate = pickupDate.startDate.format(dateFormat);
        endDate = dropOffDate.startDate.format(dateFormat);
      } else {
        startDate = currentDateRange.startDate.format(dateFormat);
        endDate = currentDateRange.endDate.format(dateFormat);
      }

      let supplierId = suggestion.data;
      let agent = tripBuilder.GetAgent();
      if (!agent) {
        alert(
          "Please select an agent before adding services to a booking.\r\nYou can select an agent by editing the trip information."
        );
        return;
      }
      $("#destination-search-progress").css("width", "0%");
      $("#destination-search-loading").show();

      let data = {
        id: supplierId,
        startDate: startDate,
        endDate: endDate,
        agent: agent,
        serviceType: serviceType,
        paxCount: tripBuilder.GetPartyCount()
      };
      /**
       * If we are creating a package, add the markup property when searching.
       */
      if (builderMode == "packagebuilder") {
        data.markup = tripBuilder.GetMarkUp();
      }
      $.ajax({
        type: "POST",
        url: "/tripbuilder/supplier",
        data: data,
        dataType: "json",
        xhr: function() {
          var xhr = new window.XMLHttpRequest();
          xhr.upload.addEventListener(
            "progress",
            function(evt) {
              if (evt.lengthComputable) {
                var percentComplete = (evt.loaded / evt.total) * 100;
                //Do something with upload progress
                $("#destination-search-progress").css("width", percentComplete + "%");
              }
            },
            false
          );

          //Download progress
          xhr.addEventListener(
            "progress",
            function(evt) {
              if (evt.lengthComputable) {
                // var percentComplete = evt.loaded / evt.total;
                var percentComplete = (evt.loaded / evt.total) * 100;
                //Do something with download progress
                $("#destination-search-progress").css("width", percentComplete + "%");
                // console.log(percentComplete);
              }
            },
            false
          );
          return xhr;
        },
        success: function(response) {
          if (response.products.length == 0) {
            alert("No services of this type for this supplier!");

            $("#destination-search-loading").hide();
            return;
          }
          $("#" + activeTab + "-search-form").hide();

          UI.currentView = "supplier-view";
          UI.previousView = "cost-breakdown";

          renderSupplierRatesAndDetails(response, activeTab);
          $("#destination-search-loading").hide();
        }
      });
    }
  });

  /**
   * Button click event which is fired when the "Add Service" button is clicked on the service modal.
   * Add the service to the existing list of services.
   */
  $("#add-service").on("click", function(e) {
    e.preventDefault();
    let currentDay = $("#modal-add-event").data("day");
    let drp;
    let carRentalPickupTime;
    let carRentalDropoffTime;
    let flightPickupTime;
    let flightDropoffTime;
    let metadata = {};
    let status = $("#" + UI.activeTab + "-service-status").val();

    /**
     * Own arrangements do not have a supplier, there create blank supplier info.
     */
    if (activeTab !== "own-arrangement") {
      metadata.supplier = {
        org_name: UI.currentService.supplierName,
        id: UI.currentService.supplierId,
        place: currentPlace
      };
    } else {
      metadata.supplier = {
        org_name: "Own Arrangement",
        id: 0,
        place: {}
      };
    }

    let costingArray = mapCostBreakDown();
    metadata.costing = costingArray;
    metadata.productId = $("#" + activeTab + "-supplier").data("product-id");
    metadata.destinationId = $("#" + activeTab + "-destination-select").val();
    metadata.remarks = $("#" + activeTab + "-remarks").val();
    if (activeTab == "meet-greet") {
      drp = $("#meet-greet-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#meet-greet-type").val();
      metadata.pick_up_date = drp.startDate;
      metadata.drop_off_date = drp.endDate; //drp.startDate.clone().add("2", "h");
    } else if (activeTab == "accommodation") {
      drp = $("#accommodation-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#accommodation-type").val();
      metadata.pick_up_date = drp.startDate;
      metadata.drop_off_date = drp.endDate;
    } else if (activeTab == "transfer") {
      drp = $("#transfer-pick-up-drop-off").data("daterangepicker");
      metadata.pick_up_date = drp.startDate;
      metadata.drop_off_date = drp.endDate;
      metadata.serviceDescription = $("#transfer-type").val();
    } else if (activeTab == "excursion") {
      drp = $("#excursion-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#excursion-type").val();
      metadata.pickupLocation = $("#excursion-pick-up-location").val();
      metadata.dropoffLocation = $("#excursion-drop-off-location").val();
      metadata.pick_up_date = drp.startDate;
      metadata.drop_off_date = drp.endDate;
    } else if (activeTab == "car-rental") {
      carRentalPickupTime = $("#car-rental-pick-up-time").data("daterangepicker");
      carRentalDropoffTime = $("#car-rental-drop-off-time").data("daterangepicker");
      metadata.pickupLocation = $("#car-rental-pick-up-location").val();
      metadata.dropoffLocation = $("#car-rental-drop-off-location").val();
      metadata.serviceDescription = $("#car-rental-type").val();
      metadata.pick_up_date = carRentalPickupTime.startDate;
      metadata.drop_off_date = carRentalDropoffTime.startDate;
    } else if (activeTab == "flight") {
      flightPickupTime = $("#flight-pick-up-time").data("daterangepicker");
      flightDropoffTime = $("#flight-drop-off-time").data("daterangepicker");
      metadata.pickupLocation = $("#flight-pick-up-location").val();
      metadata.dropoffLocation = $("#flight-drop-off-location").val();
      metadata.pick_up_date = flightPickupTime.startDate;
      metadata.drop_off_date = flightDropoffTime.startDate;
      metadata.serviceDescription = $("#flight-type").val();
    } else if (activeTab == "meal") {
      let mealTime = $("#meal-time").val();
      let mealStartTime = 8;
      switch (mealTime) {
        case "breakfast":
          mealStartTime = 8;
          break;
        case "lunch":
          mealStartTime = 13;
          break;
        case "dinner":
          mealStartTime = 19;
          break;
        default:
          mealStartTime = 8;
          break;
      }

      drp = $("#meal-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#meal-type").val();
      metadata.pick_up_date = drp.startDate
        .hours(mealStartTime)
        .minutes(00)
        .seconds(00)
        .clone();
      metadata.drop_off_date = drp.endDate
        .hours(mealStartTime + 2)
        .minutes(00)
        .seconds(00)
        .clone();
    } else if (activeTab == "own-arrangement") {
      drp = $("#own-arrangement-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#own-arrangement-description").val();
      metadata.pick_up_date = drp.startDate;
      metadata.drop_off_date = drp.endDate;
    } else if (activeTab == "day-pass") {
      drp = $("#day-pass-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#day-pass-type").val();
      metadata.pick_up_date = drp.startDate
        .hours(9)
        .minutes(00)
        .seconds(00)
        .clone();
      metadata.drop_off_date = drp.endDate
        .hours(11)
        .minutes(00)
        .seconds(00)
        .clone();
    } else if (activeTab == "entrance-fee") {
      drp = $("#entrance-fee-pick-up-drop-off").data("daterangepicker");
      metadata.serviceDescription = $("#entrance-fee-type").val();
      metadata.pick_up_date = drp.startDate
        .hours(9)
        .minutes(00)
        .seconds(00)
        .clone();
      metadata.drop_off_date = drp.endDate
        .hours(11)
        .minutes(00)
        .seconds(00)
        .clone();
    }
    if (metadata.supplier.length === 0) {
      alert("Please select a supplier before adding a service");
      return;
    }

    /**
     * Attach the rates to the meta data as well
     */
    metadata.rates = mobx.toJS(UI.currentService.rates);
    metadata.optionData = mobx.toJS(UI.currentService.optionData);

    let returnedServiceId = 0;
    if (activeTab == "car-rental") {
      returnedServiceId = tripBuilder.AddService(
        currentDay,
        activeTab,
        status,
        carRentalPickupTime.startDate,
        carRentalDropoffTime.startDate,
        metadata
      );
      renderServiceTags(
        returnedServiceId,
        currentDay,
        activeTab,
        carRentalPickupTime.startDate,
        carRentalDropoffTime.startDate
      );
    } else if (activeTab == "flight") {
      returnedServiceId = tripBuilder.AddService(
        currentDay,
        activeTab,
        status,
        flightPickupTime.startDate,
        flightDropoffTime.startDate,
        metadata
      );
      renderServiceTags(
        returnedServiceId,
        currentDay,
        activeTab,
        flightPickupTime.startDate,
        flightDropoffTime.startDate
      );
    } else {
      returnedServiceId = tripBuilder.AddService(currentDay, activeTab, status, drp.startDate, drp.endDate, metadata);
      renderServiceTags(returnedServiceId, currentDay, activeTab, drp.startDate, drp.endDate);
    }

    $('.g-d-inline[data-day="' + currentDay + '"]').data("service-id", returnedServiceId);
    unselectDays();
    currentPlace = {};

    if (tripBuilder.GetTotalBudget() > 0) {
      renderBudgetTotals();
      renderThermometer();
    }
    /**
     * clean up mobx variables
     */
    UI.currentCostRooms.clear();
    UI.currentCostPax.clear();
    UI.currentCostRoomsAndPax.clear();
    UI.clearCurrentService();
    AutoSave.saveState();
    $("#modal-add-event").modal("hide");
  });

  /**
   * Whenever a new tab is shown in the service modal, update the activeTab variable
   * so that we keep track of which tab we are working on.
   */
  $('#tabContent > li > a[data-toggle="tab"]').on("shown.bs.tab", function(e) {
    activeTab = $(e.target).data("tabname"); // newly activated tab
    UI.activeTab = activeTab;
  });

  /**
   * Button click event which used to the open the "Edit trip information" modal.
   */
  $(".modal-edit-general-trip-info-trigger").on("click", function(event) {
    $("#modal-edit-general-trip-info").modal("show");
  });

  /**
   * Button click event which is fired when the edit budget button is clicked.
   * This modal allows you to update the budget for the trip.
   */
  $(".modal-edit-budget-trigger").on("click", function(event) {
    let currentBudget = tripBuilder.GetTotalBudget();
    $("#trip-builder-budget").val(currentBudget);
    $("#modal-budget-info").modal("show");
  });

  $("#edit-trip-info").on("click", function() {
    let tripInfo = tripBuilder.TripInfo();
    let selectedAgent = tripBuilder.GetAgent();
    let bookingStatus = tripBuilder.GetBookingStatus();
    let tripBudget = tripBuilder.GetTotalBudget();

    $("#edit-trip-info-form").trigger("reset");
    if (selectedAgent) {
      $("#edit-trip-info-agent option").removeAttr("selected");
      $('#edit-trip-info-agent option[value="' + selectedAgent + '"]').prop("selected", true);
    }
    if (bookingStatus) {
      $("#edit-trip-info-status option").removeAttr("selected");
      $('#edit-trip-info-status option[value="' + bookingStatus + '"]').prop("selected", true);
    }
    if (tripBudget) {
      $("#edit-trip-info-budget").val(tripBudget);
    }
    // let paxArray = tripBuilder.Pax();

    if (!jQuery.isEmptyObject(tripInfo)) {
      $("#trip-party-name").val(tripInfo.partyName);
    }

    if (builderMode == "packagebuilder") {
      let validDateRange = tripBuilder.GetValidDateRange();
      let markup = tripBuilder.GetMarkUp();
      if (validDateRange) {
        $("#package-valid-date-range")
          .data("daterangepicker")
          .setStartDate(validDateRange.startDate);
        $("#package-valid-date-range")
          .data("daterangepicker")
          .setEndDate(validDateRange.endDate);
      }

      if (markup) {
        $("#edit-trip-info-markup").val(markup);
      }
    }
    $("#modal-trip-info").modal("show");
  });

  $("#pax-config-modal-button").on("click", function(e) {
    e.preventDefault();
    $("#pax-config-modal").modal("show");
  });

  $("#costing-sheet-button").on("click", function(e) {
    e.preventDefault();
    renderCostingSheet();
    $("#costing-sheet-modal").modal("show");
  });

  $("#pax-config-modal").on("show.bs.modal", function() {
    renderRoomConfigurations();
  });

  $("#add-room-config-button").on("click", function(e) {
    e.preventDefault();
    renderRoomDetails();
  });

  $("#autosave-start-fresh").on("click", function(e) {
    AutoSave.clear();
    $("#modal-autosave-recover").modal("hide");
  });

  $("#autosave-recover-booking").on("click", function(e) {
    let autoSaveBooking = JSON.parse(localStorage.getItem("autosave"));
    let tripInfo = autoSaveBooking.tripInfo;
    tripBuilder.AddTripInfo(tripInfo);

    const startDate = moment(autoSaveBooking.tripInfo.travel_date);
    const endDate = moment(autoSaveBooking.tripInfo.departure_date);
    let diff = endDate.diff(startDate, "days"); // returns correct number
    $("#trip-date-range")
      .data("daterangepicker")
      .setStartDate(startDate);
    $("#trip-date-range")
      .data("daterangepicker")
      .setEndDate(endDate);

    tripBuilder.ClearItinerary();
    tripBuilder.ClearRoomConfigs();

    let roomConfigId = tripBuilder.AddRoomConfig(autoSaveBooking.tripInfo.partyName);
    let roomConfig = tripBuilder.GetRoomConfig(roomConfigId);
    for (const config of autoSaveBooking.roomConfig) {
      let roomId = roomConfig.addRoom(
        config.name,
        config.adults,
        config.children,
        config.infants,
        config.type,
        config.id
      );
      let currentRoom = roomConfig.getRoom(roomId);
      for (const pax of config.pax) {
        currentRoom.addPax(pax.name, "", pax.type, pax.age, pax.notes);
      }
    }

    tripBuilder.SetTotalDays(diff);
    tripBuilder.SetStartDate(startDate.clone());
    tripBuilder.SetEndDate(endDate.clone());
    tripBuilder.SetAgent(autoSaveBooking.agent);
    tripBuilder.SetTotalBudget(parseInt(autoSaveBooking.budget));
    tripBuilder.SetBookingStatus(autoSaveBooking.bookingStatus);

    renderBudgetTotals();
    renderThermometer();
    renderTripDays(startDate, endDate);
    renderTripInfo();

    for (const itinerary of autoSaveBooking.itinerary) {
      let returnedServiceId = tripBuilder.AddService(
        itinerary.day,
        itinerary.serviceType,
        itinerary.status,
        moment(itinerary.startDate),
        moment(itinerary.endDate),
        itinerary.data
      );
      renderServiceTags(
        returnedServiceId,
        itinerary.day,
        itinerary.serviceType,
        moment(itinerary.startDate),
        moment(itinerary.endDate)
      );

      $('.g-d-inline[data-day="' + itinerary.day + '"]').data("service-id", returnedServiceId);
    }
    AutoSave.clear();
    $("#modal-autosave-recover").modal("hide");
  });

  $("#save-room-details").on("click", function(e) {
    e.preventDefault();
    if (!$("#room-detail-wrapper")[0].checkValidity()) {
    }

    if (UI.currentRoom.isUpdate == true) {
      if (UI.currentRoom.id == 0) {
        alert("There is no room to edit");
        return;
      }

      let updatedRoom = {
        id: -1,
        name: "",
        type: "",
        adults: 0,
        children: 0,
        infants: 0,
        adultPax: [],
        childrenPax: [],
        infantPax: [],
        pax: [],
        newRoom: false
      };

      updatedRoom.id = UI.currentRoom.id;
      updatedRoom.name = $("#room-name").val();
      updatedRoom.type = $("#room-type option:selected").val();
      updatedRoom.adults = parseInt($("#room-adults-count").val());
      updatedRoom.children = parseInt($("#room-children-count").val());
      updatedRoom.infants = parseInt($("#room-infants-count").val());
      updatedRoom.adultPax = getAllFields("#adult-pax-wrapper");
      updatedRoom.childrenPax = getAllFields("#child-pax-wrapper");
      updatedRoom.infantPax = getAllFields("#infant-pax-wrapper");
      updatedRoom.pax = [...updatedRoom.adultPax, ...updatedRoom.childrenPax, ...updatedRoom.infantPax];

      if (UI.currentRoom.isNewRoom == true) {
        updatedRoom.newRoom = true;
        for (let index = 0; index < UI.paxConfig.newRooms.length; index++) {
          if (UI.paxConfig.newRooms[index].id == updatedRoom.id) {
            UI.paxConfig.newRooms[index] = updatedRoom;
            break;
          }
        }
      } else {
        let currentRoomConfig = tripBuilder.GetRoomConfig(1);
        currentRoomConfig.updateRoom(updatedRoom.id, updatedRoom);
      }
      UI.resetCurrentRoom();
    } else {
      let newRoom = {
        id: -1,
        name: "",
        type: "",
        adults: 0,
        children: 0,
        infants: 0,
        adultPax: [],
        childrenPax: [],
        infantPax: [],
        pax: [],
        newRoom: true
      };

      newRoom.id = UI.paxConfig.nextRoomId;
      newRoom.name = $("#room-name").val();
      newRoom.type = $("#room-type option:selected").val();
      newRoom.adults = parseInt($("#room-adults-count").val());
      newRoom.children = parseInt($("#room-children-count").val());
      newRoom.infants = parseInt($("#room-infants-count").val());
      newRoom.adultPax = getAllFields("#adult-pax-wrapper");
      newRoom.childrenPax = getAllFields("#child-pax-wrapper");
      newRoom.infantPax = getAllFields("#infant-pax-wrapper");
      newRoom.pax = [...newRoom.adultPax, ...newRoom.childrenPax, ...newRoom.infantPax];

      if (newRoom.name == "") {
        alert("Please enter in a room name");
        return false;
      }

      if (newRoom.type == "") {
        alert("Please select a room type");
        return false;
      }

      UI.paxConfig.newRooms.push(newRoom);
      UI.paxConfig.isDirty = true;
      UI.resetNewRoom();
      UI.paxConfig.nextRoomId++;
    }
  });

  function getAllFields(wrapperId) {
    const $wrapper = $(wrapperId);
    const fieldSets = $wrapper.find("fieldset");
    var result = [];

    fieldSets.each(function() {
      var fields = {};
      $.each($(this).serializeArray(), function() {
        fields[this.name] = this.value;
      });
      result.push(fields);
    });
    return result;
  }

  $("#room-detail-wrapper").on("click", ".add-pax-button", function(e) {
    e.preventDefault();
    let source = document.getElementById("adult-pax-template").innerHTML;
    let template = Handlebars.compile(source);
    let paxType = $(this).data("pax-type");
    let blankPaxData = {
      id: 0,
      type: paxType,
      name: "",
      age: "",
      notes: ""
    };

    switch (paxType) {
      case "adult":
        blankPaxData.id = ++UI.paxConfig.newRoom.adults;
        $("#room-adults-count").val(UI.paxConfig.newRoom.adults);
        break;
      case "child":
        blankPaxData.id = ++UI.paxConfig.newRoom.children;
        $("#room-children-count").val(UI.paxConfig.newRoom.children);
        break;
      case "infant":
        blankPaxData.id = ++UI.paxConfig.newRoom.infants;
        $("#room-infants-count").val(UI.paxConfig.newRoom.infants);
        break;
      default:
        blankPaxData.id = ++UI.paxConfig.newRoom.adults;
        $("#room-adults-count").val(UI.paxConfig.newRoom.adults);
        break;
    }

    let blankForm = template(blankPaxData);
    $("#" + paxType + "-pax-wrapper").append(blankForm);
  });

  $("#pax-config-modal").on("show.bs.tab", 'a[data-toggle="tab"]', function(e) {
    let target = $(e.target).attr("href");
    if (target == "#room-detail") {
      let roomId = $(e.target).data("room-id");
      let isNewRoom = false;
      if (typeof $(e.target).data("new-room") !== "undefined") {
        isNewRoom = true;
      }
      renderRoomDetails(roomId, isNewRoom);
    } else {
      renderRoomConfigurations();
    }
  });

  $("#pax-config-modal").on("hidden.bs.modal", function() {
    UI.paxConfig.newRooms.clear();
  });

  $("#save-pax-config-button").on("click", function(e) {
    e.preventDefault();
    const currentRoomConfigCount = tripBuilder.GetRoomConfigCount();
    let currentRoomConfig = {};
    let tripInfo = tripBuilder.TripInfo();
    tripInfo.partyCount = {
      adults: 0,
      children: 0,
      infants: 0
    };
    tripInfo.partyRooms = {
      doubles: 0,
      twins: 0,
      singles: 0,
      triples: 0
    };
    if (currentRoomConfigCount == 0) {
      tripBuilder.AddRoomConfig("Room Config");
    } else {
      tripInfo = tripBuilder.TripInfo();
    }
    currentRoomConfig = tripBuilder.GetRoomConfig(1);
    if (UI.paxConfig.newRooms.length > 0) {
      for (const room of UI.paxConfig.newRooms) {
        const newRoomId = currentRoomConfig.addRoom(room.name, room.adults, room.children, room.infants, room.type);
        let newRoom = currentRoomConfig.getRoom(newRoomId);
        for (const pax of room.pax) {
          newRoom.addPax(pax.name, "", pax.type, pax.age);
        }
      }
    }
    UI.paxConfig.newRooms.clear();

    for (const room of currentRoomConfig.rooms) {
      tripInfo.partyCount.adults += room.adults;
      tripInfo.partyCount.children += room.children;
      tripInfo.partyCount.infants += room.infants;
      switch (room.type) {
        case "single":
          tripInfo.partyRooms.singles++;
          break;
        case "double":
          tripInfo.partyRooms.doubles++;
          break;
        case "twin":
          tripInfo.partyRooms.twins++;
          break;
        case "triple":
          tripInfo.partyRooms.triples++;
          break;
        default:
          tripInfo.partyRooms.doubles++;
          break;
      }
    }
    tripInfo.partyRooms.singles = tripInfo.partyRooms.singles.toString();
    tripInfo.partyRooms.doubles = tripInfo.partyRooms.doubles.toString();
    tripInfo.partyRooms.twins = tripInfo.partyRooms.twins.toString();
    tripInfo.partyRooms.triples = tripInfo.partyRooms.triples.toString();
    tripBuilder.AddTripInfo(tripInfo);
    renderTripInfo();

    $("#pax-config-modal").modal("hide");
  });

  $("#trip-days").on("click", ".g-d-inline > .modal-add-event-trigger", function(event) {
    const agent = tripBuilder.GetAgent();
    const roomConfigCount = tripBuilder.GetRoomConfigCount();
    if (!agent) {
      alert(
        "Please select an agent before adding services to a booking.\r\nYou can select an agent by editing the trip information."
      );
      return;
    }
    if (roomConfigCount == 0) {
      alert("Please setup your room config before adding any services");
      return;
    }

    UI.currentView = "cost-breakdown";
    UI.previousView = "day-view";

    let currentDay = $(this)
      .parent()
      .data("day");
    let currentDaysDate = $(this)
      .parent()
      .data("date");
    let currentDayName = $(this)
      .parent()
      .data("dayname");

    UI.currentDay = moment(currentDaysDate);
    $(".i-font-tiny").addClass("g-onHover-show-grandchild-grandchild");
    $("#add-service-modal-title").text(
      currentDay + " " + currentDayName + ", " + moment(currentDaysDate).format("Do MMMM YYYY")
    );
    $("#modal-add-event").data("day", currentDay);

    var tripRange = $("#trip-date-range").data("daterangepicker");
    $(".single-car-datepicker").daterangepicker({
      singleDatePicker: true,
      timePicker: true,
      timePickerIncrement: 15,
      showDropdowns: true,
      locale: {
        format: "D MMMM YYYY h:mm:ss a"
      },
      startDate: cloneDate(currentDaysDate, 10, 0),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });
    $("#flight-pick-up-time").daterangepicker({
      singleDatePicker: true,
      timePicker: true,
      timePickerIncrement: 15,
      showDropdowns: true,
      locale: {
        format: "D MMMM YYYY h:mm:ss a"
      },
      startDate: cloneDate(currentDaysDate, 10, 0),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });

    $("#flight-drop-off-time").daterangepicker({
      singleDatePicker: true,
      timePicker: true,
      timePickerIncrement: 15,
      showDropdowns: true,
      locale: {
        format: "D MMMM YYYY h:mm:ss a"
      },
      startDate: cloneDate(currentDaysDate, 12, 0),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });

    $(".single-datepicker").daterangepicker({
      singleDatePicker: true,
      timePicker: true,
      timePickerIncrement: 15,
      showDropdowns: true,
      locale: {
        format: "D MMMM YYYY h:mm:ss a"
      },
      startDate: moment(currentDaysDate).toDate(),
      minDate: moment(currentDaysDate).toDate(),
      maxDate: moment(currentDaysDate)
        .endOf("day")
        .toDate()
    });

    $(".daterange-datepicker").daterangepicker({
      showDropdowns: true,
      locale: {
        format: "D MMMM YYYY"
      },
      startDate: moment(currentDaysDate).toDate(),
      // endDate: tripRange.endDate.toDate(),
      endDate: moment(currentDaysDate)
        .add(1, "d")
        .toDate(),

      minDate: moment(currentDaysDate).toDate(),
      maxDate: tripRange.endDate.toDate()
    });

    $("#excursion-pick-up-drop-off").daterangepicker({
      showDropdowns: true,
      timePicker: true,
      locale: {
        format: "D MMMM YYYY h:mm a"
      },
      startDate: cloneDate(currentDaysDate, 10, 0),
      endDate: cloneDate(currentDaysDate, 12),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });

    $("#meet-greet-pick-up-drop-off").daterangepicker({
      showDropdowns: true,
      timePicker: true,
      locale: {
        format: "D MMMM YYYY h:mm a"
      },
      startDate: cloneDate(currentDaysDate, 9, 0),
      endDate: cloneDate(currentDaysDate, 11),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });

    $("#transfer-pick-up-drop-off").daterangepicker({
      showDropdowns: true,
      timePicker: true,
      locale: {
        format: "D MMMM YYYY h:mm a"
      },
      startDate: cloneDate(currentDaysDate, 9, 0),
      endDate: cloneDate(currentDaysDate, 11),
      minDate: cloneDate(currentDaysDate, 5),
      maxDate: tripRange.endDate
    });

    $("#day-pass-pick-up-drop-off").daterangepicker({
      showDropdowns: true,
      timePicker: true,
      locale: {
        format: "D MMMM YYYY h:mm a"
      },
      startDate: cloneDate(currentDaysDate, 9, 0),
      endDate: cloneDate(currentDaysDate, 11, 0),
      minDate: cloneDate(currentDaysDate, 5, 0),
      maxDate: tripRange.endDate
    });

    $(".daterange-datepicker-with-time-one-day").daterangepicker({
      showDropdowns: true,
      singleDatePicker: true,
      timePicker: true,
      locale: {
        format: "D MMMM YYYY h:mm:ss a"
      },
      startDate: moment(currentDaysDate).startOf("day"),
      endDate: moment(currentDaysDate).endOf("day"),
      minDate: moment(currentDaysDate).startOf("day"),
      maxDate: moment(currentDaysDate).endOf("day")
    });

    $(".add-event-date-range")
      .off("apply.daterangepicker")
      .on("apply.daterangepicker", handleServiceDateChange);

    $('#tabContent li > a[href="#accommodation"]').tab("show");
    $('a[href="#accommodation-search-form-pane"]').tab("show");
    $("#accommodation-location").text("");
    $("#modal-add-event").modal("show");
    $(this).addClass("day-selected");
  });

  $("#trip-party-children").on("keyup", function(e) {
    let numberOfChildren = parseInt($(this).val());
    if (Number.isInteger(numberOfChildren)) {
      let source = document.getElementById("child-age-template").innerHTML;
      let template = Handlebars.compile(source);
      let html = template({children: numberOfChildren});
      $("#children-ages-select").html(html);
    }
  });

  $("#modal-add-event").on("hidden.bs.modal", function() {
    unselectDays();
    activeTab = "accommodation";
    currentPlace = {};
    $(this)
      .find("form")
      .trigger("reset");
    $(".search-results").hide();
    for (var currentTab of UI.tabs) {
      $("#" + currentTab + "-search-results").hide();
      if ($.fn.DataTable.isDataTable("#" + currentTab + "-search-results-body-table")) {
        $("#" + currentTab + "-search-results-body-table")
          .DataTable()
          .search("")
          .clear()
          .destroy();
      }

      $("#view-" + currentTab + "-place").hide();
      $("#" + currentTab + "-search-form").show();
      $("#" + currentTab + "-cost-supplier").html("-");
      $("#" + currentTab + "-cost-breakdown").html("-");
      $("#" + currentTab + "-cost-total").html("-");
      $("#" + currentTab + "-cost-grand-total").html("-");

      $("#" + currentTab + "-supplier").removeData("serviceRate");
      $("#" + currentTab + "-supplier").removeData("single-rate");
      $("#" + currentTab + "-supplier").removeData("twin-rate");
      $("#" + currentTab + "-supplier").removeData("rates-table");

      let tabId = "#" + currentTab + "-service-line-status";
      $(tabId)
        .attr("class", "")
        .addClass("service-line-it");
      $(tabId).html("IT");
    }

    searchDataTable = null;
    /**
     * Reset mobx session variables
     */
    UI.currentCostRooms.clear();
    UI.currentCostPax.clear();
    UI.currentCostRoomsAndPax.clear();
    UI.clearCurrentService();
    $(".search-results-body").off("change", ".meal-rating-selector");
    $("#order-by-value").off("change");
  });

  $("#modal-add-event").on("shown.bs.modal", function() {});

  /**
   * Click event which is fired whenever a service block is clicked on the TripBuilder.
   * It determines which type of service you clicked, loads that services details and opens the modal box.
   */
  $("#trip-days").on(
    "click",
    ".g-d-inline > .modal-add-event-trigger > .modal-edit-event-trigger, .g-d-inline > .modal-add-event-trigger > .multiday-holder-bottom > .modal-edit-event-trigger, .g-d-inline > .modal-add-event-trigger > .multiday-holder-top > .modal-edit-event-trigger",
    function(event) {
      event.stopPropagation();

      let serviceId = $(this).data("service-id");
      // Update the global variable CURRENT_SERVICE_ID, we will need it comes to saving our edits.
      CURRENT_SERVICE_ID = serviceId;

      let currentService = tripBuilder.GetService(serviceId);

      UI.currentService.supplierName = currentService.data.supplier.org_name;
      UI.currentService.supplierId = currentService.data.supplier.id;
      UI.currentService.productId = currentService.data.productId;
      UI.currentService.productDescription = currentService.data.serviceDescription;
      UI.currentService.address = `${currentService.data.supplier.place.street} ${
        currentService.data.supplier.place.suburb
      } ${currentService.data.supplier.place.town}`;
      UI.currentService.costBreakDown = currentService.data.costing;
      UI.currentService.rates = currentService.data.rates;
      UI.currentService.remarks = currentService.data.remarks;
      UI.currentService.optionData = currentService.data.optionData;

      UI.activeTab = currentService.serviceType;
      
      $("#edit-" + currentService.serviceType + "-modal-title").text(
        currentService.day +
          " " +
          moment(currentService.startDate).format("dddd") +
          ", " +
          moment(currentService.startDate).format("Do MMMM YYYY")
      );
      $("#modal-edit-" + currentService.serviceType).data("service-id", serviceId);

      $("#modal-edit-" + currentService.serviceType).modal("show");

      let destinationId =
        "undefined" === typeof currentService.data.destinationId ? "" : currentService.data.destinationId;
      let bookingStatus = currentService.status;

      let dateRange = {};
      var tripRange = $("#trip-date-range").data("daterangepicker");
      $(".daterange-datepicker").daterangepicker({
        showDropdowns: true,
        locale: {
          format: "D MMMM YYYY"
        },
        minDate: tripRange.startDate.toDate(),
        maxDate: tripRange.endDate.toDate()
      });

      $(".single-datepicker").daterangepicker({
        singleDatePicker: true,
        timePicker: true,
        timePickerIncrement: 15,
        showDropdowns: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        }
      });

      $("#edit-flight-pick-up-time").daterangepicker({
        singleDatePicker: true,
        timePicker: true,
        timePickerIncrement: 15,
        showDropdowns: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        }
      });

      $("#edit-meet-greet-pick-up-drop-off").daterangepicker({
        showDropdowns: true,
        timePicker: true,
        locale: {
          format: "D MMMM YYYY h:mm a"
        },
        minDate: tripRange.startDate.toDate(),
        maxDate: tripRange.endDate.toDate()
      });
      $("#edit-excursion-pick-up-drop-off").daterangepicker({
        showDropdowns: true,
        timePicker: true,
        locale: {
          format: "D MMMM YYYY h:mm a"
        },
        minDate: tripRange.startDate.toDate(),
        maxDate: tripRange.endDate.toDate()
      });
      $("#edit-transfer-pick-up-drop-off").daterangepicker({
        showDropdowns: true,
        timePicker: true,
        locale: {
          format: "D MMMM YYYY h:mm a"
        },
        minDate: tripRange.startDate.toDate(),
        maxDate: tripRange.endDate.toDate()
      });

      $("#edit-flight-drop-off-time").daterangepicker({
        singleDatePicker: true,
        timePicker: true,
        timePickerIncrement: 15,
        showDropdowns: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        }
      });

      $(".daterange-datepicker-with-time").daterangepicker({
        showDropdowns: true,
        timePicker: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        }
      });

      $(".daterange-datepicker-with-time-one-day").daterangepicker({
        showDropdowns: true,
        singleDatePicker: true,
        timePicker: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        }
      });

      $(".single-car-datepicker").daterangepicker({
        singleDatePicker: true,
        timePicker: true,
        timePickerIncrement: 15,
        showDropdowns: true,
        locale: {
          format: "D MMMM YYYY h:mm:ss a"
        },
        minDate: tripRange.startDate.toDate(),
        maxDate: tripRange.endDate.toDate()
      });

      $(".add-event-date-range")
        .off("apply.daterangepicker", handleServiceDateChange)
        .on("apply.daterangepicker", handleServiceDateChange);

      // $(".add-event-date-range").on("apply.daterangepicker", function(ev, picker) {
      //   renderCost_workinprogress(true);
      // });

      let serviceLocation =
        currentService.data.supplier.place.street +
        " " +
        currentService.data.supplier.place.suburb +
        " " +
        currentService.data.supplier.place.town;

      switch (currentService.serviceType) {
        case "accommodation":
          $("#edit-accommodation-location").val(serviceLocation);
          $("#edit-accommodation-supplier").val(currentService.data.supplier.org_name);
          $('#edit-accommodation-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $('#edit-accommodation-service-status option[value="' + bookingStatus + '"]').prop("selected", true);
          $("#edit-accommodation-type").val(currentService.data.serviceDescription);
          $("#edit-accommodation-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-accommodation-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          renderServiceLineStatus("#edit-accommodation-service-line-status", bookingStatus);
          break;
        case "excursion":
          $("#edit-excursion-location").val(serviceLocation);
          $("#edit-excursion-supplier").val(currentService.data.supplier.org_name);
          $('#edit-excursion-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-excursion-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-excursion-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-excursion-type").val(currentService.data.serviceDescription);

          renderServiceLineStatus("#edit-excursion-service-line-status", bookingStatus);
          break;
        case "meet-greet":
          $("#edit-meet-greet-location").val(serviceLocation);
          $("#edit-meet-greet-supplier").val(currentService.data.supplier.org_name);
          $('#edit-meet-greet-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-meet-greet-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-meet-greet-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-meet-greet-type").val(currentService.data.serviceDescription);
          renderServiceLineStatus("#edit-meet-greet-service-line-status", bookingStatus);

          break;
        case "car-rental":
          $("#edit-car-rental-location").val(serviceLocation);
          $("#edit-car-rental-supplier").val(currentService.data.supplier.org_name);
          $('#edit-car-rental-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-car-rental-remarks").val(currentService.data.remarks);
          let pickupDate = $("#edit-car-rental-pick-up-time").data("daterangepicker");
          let dropOffDate = $("#edit-car-rental-drop-off-time").data("daterangepicker");
          pickupDate.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dropOffDate.setStartDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-car-rental-type").val(currentService.data.serviceDescription);
          renderServiceLineStatus("#edit-car-rental-service-line-status", bookingStatus);

          break;
        case "meal":
          $("#edit-meal-location").val(serviceLocation);
          $("#edit-meal-supplier").val(currentService.data.supplier.org_name);
          $('#edit-meal-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-meal-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-meal-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-meal-type").val(currentService.data.serviceDescription);
          renderServiceLineStatus("#edit-meal-service-line-status", bookingStatus);

          break;
        case "flight":
          $("#edit-flight-supplier").val(currentService.data.supplier.org_name);
          $('#edit-flight-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-flight-remarks").val(currentService.data.remarks);
          let flightPickupDate = $("#edit-flight-pick-up-time").data("daterangepicker");
          let flightDropOffDate = $("#edit-flight-drop-off-time").data("daterangepicker");
          flightPickupDate.setStartDate(moment(currentService.data.pick_up_date).toDate());
          flightDropOffDate.setStartDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-flight-type").val(currentService.data.serviceDescription);

          renderServiceLineStatus("#edit-flight-service-line-status", bookingStatus);
          break;
        case "transfer":
          $("#edit-transfer-location").val(serviceLocation);
          $("#edit-transfer-supplier").val(currentService.data.supplier.org_name);
          $('#edit-transfer-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-transfer-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-transfer-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-transfer-type").val(currentService.data.serviceDescription);

          renderServiceLineStatus("#edit-transfer-service-line-status", bookingStatus);
          break;
        case "entrance-fee":
          $("#edit-entrance-fee-location").val(serviceLocation);
          $("#edit-entrance-fee-supplier").val(currentService.data.supplier.org_name);
          $('#edit-entrance-fee-destination-select option[value="' + destinationId + '"]').prop("selected", true);
          $("#edit-entrance-fee-remarks").val(currentService.data.remarks);
          dateRange = $("#edit-entrance-fee-pick-up-drop-off").data("daterangepicker");
          dateRange.setStartDate(moment(currentService.data.pick_up_date).toDate());
          dateRange.setEndDate(moment(currentService.data.drop_off_date).toDate());
          $("#edit-entrance-fee-type").val(currentService.data.serviceDescription);
          renderServiceLineStatus("#edit-entrance-fee-service-line-status", bookingStatus);
          break;
        default:
          break;
      }

      let costRooms = [];
      let costPaxRoomCosts = [];

      for (const costing of currentService.data.costing) {
        for (const room of costing.rooms) {
          if (costRooms.indexOf(room.roomId) == -1) {
            costRooms.push(parseInt(room.roomId));
          }
          costPaxRoomCosts.push({roomId: room.roomId, paxId: room.paxId});
        }
      }

      UI.currentCostRooms = costRooms;
      UI.currentCostPax = costPaxRoomCosts;
      renderCostBreakDown(
        currentService.serviceType,
        currentService.data.supplier.org_name,
        currentService.data.supplier.id,
        currentService.data.productId,
        UI.currentService.address,
        currentService.data.costing,
        currentService.data.rates,
        currentService.data.serviceDescription,
        true
      );
    }
  );

  $(".btn-delete-service").on("click", function(e) {
    e.preventDefault();
    tripBuilder.RemoveService(CURRENT_SERVICE_ID);
    removeServiceTags(CURRENT_SERVICE_ID);
    if (tripBuilder.GetTotalBudget() > 0) {
      renderBudgetTotals();
      renderThermometer();
    }
  });

  /**
   * This is the old version of the saving of edits
   
  $(".modal-edit-save").on("click", function(e) {
    e.preventDefault();
    let currentService = tripBuilder.GetService(CURRENT_SERVICE_ID);
    let currentServiceType = currentService.serviceType;

    let drp = $("#edit-" + currentServiceType + "-pick-up-drop-off").data("daterangepicker");
    let tripStartDate = tripBuilder.GetStartDate();
    let serviceStartDate = drp.startDate;
    let serviceEndDate = drp.endDate;
    let currentDay = serviceStartDate.diff(tripStartDate, "days") + 1;
    // console.log(currentDay);
    let metadata = {};
    metadata.pick_up_date = serviceStartDate;
    metadata.drop_off_date = serviceEndDate;
    metadata.destinationId = currentService.data.destinationId;
    metadata.productId = currentService.data.productId;
    metadata.serviceDescription = currentService.data.serviceDescription;

    if (currentService.serviceType == "meet-greet") {
      metadata.supplier = {...currentService.data.supplier};
      metadata.destinationId = $("#edit-meet-greet-select").val();
    } else if (currentService.serviceType == "accommodation") {
      metadata.roomtype = $("#edit-accommodation-room-type").val();
      metadata.supplier = {...currentService.data.supplier};
      metadata.destinationId = $("#edit-destination-select").val();
    } else if (currentService.serviceType == "excursion") {
      metadata.supplier = {...currentService.data.supplier};
      metadata.destinationId = $("#edit-excursion-select").val();
    }

    tripBuilder.UpdateService(
      CURRENT_SERVICE_ID,
      currentService.serviceType,
      currentDay,
      serviceStartDate,
      serviceEndDate,
      metadata
    );
    removeServiceTags(CURRENT_SERVICE_ID);
    renderServiceTags(CURRENT_SERVICE_ID, currentDay, currentService.serviceType, serviceStartDate, serviceEndDate);

    currentPlace = {};
    unselectDays();
    if (tripBuilder.GetTotalBudget() > 0) {
      renderBudgetTotals();
      renderThermometer();
    }
    $("#modal-edit-" + currentServiceType).modal("hide");
  });

  */

  $(".modal-edit-save").on("click", function(e) {
    e.preventDefault();
    let currentService = tripBuilder.GetService(CURRENT_SERVICE_ID);
    let currentServiceType = currentService.serviceType;
    let serviceStartDate = null;
    let serviceEndDate = null;

    let oldServiceStartDate = moment(currentService.startDate);
    let oldServiceEndDate = moment(currentService.endDate);
    let oldServiceDayCount = oldServiceEndDate.diff(oldServiceStartDate.startOf("day"), "days");

    if (currentServiceType == "car-rental" || currentServiceType == "flight") {
      let pickupDate = $("#edit-" + currentServiceType + "-pick-up-time").data("daterangepicker");
      let dropOffDate = $("#edit-" + currentServiceType + "-drop-off-time").data("daterangepicker");
      serviceStartDate = pickupDate.startDate;
      serviceEndDate = dropOffDate.startDate;
    } else {
      let currentDateRange = $("#edit-" + currentServiceType + "-pick-up-drop-off").data("daterangepicker");
      serviceStartDate = currentDateRange.startDate;
      serviceEndDate = currentDateRange.endDate;
    }

    let status = $("#edit-" + currentServiceType + "-service-status").val();
    let remarks = $("#edit-" + currentServiceType + "-remarks").val();
    let tripStartDate = tripBuilder.GetStartDate();

    let currentDay = serviceStartDate.diff(tripStartDate.startOf("day"), "days") + 1;
    let metadata = {};
    metadata.pick_up_date = serviceStartDate;
    metadata.drop_off_date = serviceEndDate;

    if (currentService.data.hasOwnProperty("id")) {
      metadata.id = currentService.data.id;
    }

    let costingArray = mapCostBreakDown(true);
    metadata.destinationId = currentService.data.destinationId;
    metadata.dropoffLocation = currentService.data.dropoffLocation;
    metadata.pickupLocation = currentService.data.pickupLocation;
    metadata.productId = currentService.data.productId;
    metadata.optionData = currentService.data.optionData;
    metadata.serviceDescription = currentService.data.serviceDescription;
    metadata.supplier = {...currentService.data.supplier};
    metadata.costing = costingArray;
    metadata.rates = mobx.toJS(UI.currentService.rates);
    metadata.remarks = remarks;
    tripBuilder.UpdateService(
      CURRENT_SERVICE_ID,
      currentService.serviceType,
      currentDay,
      status,
      serviceStartDate,
      serviceEndDate,
      oldServiceStartDate,
      oldServiceEndDate,
      metadata
    );
    removeServiceTags(CURRENT_SERVICE_ID);
    renderServiceTags(CURRENT_SERVICE_ID, currentDay, currentService.serviceType, serviceStartDate, serviceEndDate);

    currentPlace = {};
    unselectDays();
    if (tripBuilder.GetTotalBudget() > 0) {
      renderBudgetTotals();
      renderThermometer();
    }
    $("#modal-edit-" + currentServiceType).modal("hide");
  });

  function selectDay(currentDay) {
    $('.g-d-inline[data-day="' + currentDay + '"] > .modal-add-event-trigger').addClass("day-selected");
  }

  function unselectDays() {
    $(".g-d-inline > .modal-add-event-trigger").removeClass("day-selected");
  }

  $(".destination-select").on("change", function(e) {
    var destination = $(this).val();
    var destinationText = $(":selected", this).text();
    var serviceType = $(this).data("servicetype");
    if (destination !== "") {
      let startDate = {};
      let endDate = {};
      let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");

      if (activeTab == "car-rental" || activeTab == "flight") {
        let pickupDate = $("#car-" + activeTab + "-pick-up-time").data("daterangepicker");
        let dropOffDate = $("#" + activeTab + "-drop-off-time").data("daterangepicker");
        startDate = pickupDate.startDate.format(dateFormat);
        endDate = dropOffDate.startDate.format(dateFormat);
      } else {
        startDate = currentDateRange.startDate.format(dateFormat);
        endDate = currentDateRange.endDate.format(dateFormat);
      }

      let source = document.getElementById("destination-row-result-template").innerHTML;
      let template = Handlebars.compile(source);

      let selectSource = document.getElementById("destination-row-result-toolbar-template").innerHTML;
      let selectTemplate = Handlebars.compile(selectSource);
      let showMeals = activeTab == "accommodation";
      let selectHtml = selectTemplate({showMeals: showMeals});
      let agent = tripBuilder.GetAgent();
      if (!agent) {
        alert(
          "Please select an agent before adding services to a booking.\r\nYou can select an agent by editing the trip information."
        );
        return;
      }
      if ($.fn.DataTable.isDataTable("#" + activeTab + "-search-results-body-table")) {
        $("#" + activeTab + "-search-results-body-table")
          .DataTable()
          .clear()
          .destroy();
      }

      searchDataTable = $("#" + activeTab + "-search-results-body-table").DataTable({
        processing: true,
        serverSide: true,
        lengthChange: false,
        dom: '<"order-by-toolbar">frtip',
        language: {
          search: "Search by keywords: ",
          processing: `<div style="background-color: white;padding: 6px;display: block;margin: 0 auto;width: 380px;">
            <img src="themes/private_aaa/assets/assets_icons_bitmaps/loading-surfer.gif">            
            <h5 class="center">Searching...</h5>`
        },
        ajax: {
          data: function(d) {
            d.destination = destination;
            d.serviceType = serviceType;
            d.startDate = startDate;
            d.endDate = endDate;
            d.limit = 10;
            d.offset = 10 * (CURRENT_PAGE - 1);
            d.agent = agent;
            d.paxCount = tripBuilder.GetPartyCount();
          },
          type: "POST",
          url: "/tripbuilder/destination/places"
        },
        columns: [{data: "org_name"}],
        columnDefs: [
          {
            targets: 0,
            render: function(data, type, row) {
              row.column1 = serviceType == 1 ? "Single Rate" : "Child Rate";
              row.column2 = serviceType == 1 ? "Twin/Double Rate" : "Adult Rate";
              row.serviceType = serviceType;

              let html = template(row);
              return html;
            }
          }
        ]
      });

      searchDataTable.on("preXhr", function(e, settings, data) {
        let mealCode = $("#" + activeTab + "-meal-rating-selector").val();
        data.mealCode = mealCode;
      });

      $("div.order-by-toolbar").html(selectHtml);

      $("#order-by-value").on("change", function() {
        searchDataTable.draw();
      });

      $(".search-results-body").on("change", ".meal-rating-selector", function(e) {
        searchDataTable.draw();
      });

      $("#" + activeTab + "-search-location").text(destinationText);
      $("#" + activeTab + "-search-results").show();
      $("#" + activeTab + "-search-results-body").show();
      $("#" + activeTab + "-search-form").hide();

      UI.currentView = "search-results";
      UI.previousView = "cost-breakdown";
    }
  });

  $(".search-results-body").on("click", ".view-place, .place-read-more", function(e) {
    e.preventDefault();
    $("#destination-search-progress").css("width", "0%");
    $("#destination-search-loading").show();
    let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");
    let startDate = currentDateRange.startDate.format(dateFormat);
    let endDate = currentDateRange.endDate.format(dateFormat);
    let supplierId = $(this).data("supplier-id");
    let agent = tripBuilder.GetAgent();
    let serviceType = $(this).data("service-type");
    if (!agent) {
      alert(
        "Please select an agent before adding services to a booking.\r\nYou can select an agent by editing the trip information."
      );
      return;
    }
    $.ajax({
      type: "post",
      url: "/tripbuilder/supplier",
      data: {id: supplierId, startDate: startDate, endDate: endDate, agent: agent, serviceType: serviceType},
      dataType: "json",
      xhr: function() {
        var xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener(
          "progress",
          function(evt) {
            if (evt.lengthComputable) {
              var percentComplete = (evt.loaded / evt.total) * 100;
              //Do something with upload progress
              $("#destination-search-progress").css("width", percentComplete + "%");
            }
          },
          false
        );

        //Download progress
        xhr.addEventListener(
          "progress",
          function(evt) {
            if (evt.lengthComputable) {
              // var percentComplete = evt.loaded / evt.total;
              var percentComplete = (evt.loaded / evt.total) * 100;
              //Do something with download progress
              $("#destination-search-progress").css("width", percentComplete + "%");
              // console.log(percentComplete);
            }
          },
          false
        );
        return xhr;
      },
      success: function(response) {
        $("#destination-search-loading").hide();
        $("#" + activeTab + "-search-results").hide();
        $("#" + activeTab + "-search-results-body").hide();
        var source = document.getElementById("place-template").innerHTML;
        var template = Handlebars.compile(source);
        response.activeTab = activeTab;
        var html = template(response);
        $("#view-" + activeTab + "-place-body").html(html);

        if ($.fn.DataTable.isDataTable("#" + activeTab + "-supplier-rates-table")) {
          $("#" + activeTab + "-supplier-rates-table")
            .DataTable()
            .clear()
            .destroy();
        }
        $("#view-" + activeTab + "-place-body").data("products", response.products);

        let selectedData =
          activeTab == "accommodation" ? response.products[0].suppRates : response.products[0].costRates;

        let ratesDataTable = $("#" + activeTab + "-supplier-rates-table").DataTable({
          paging: false,
          ordering: false,
          info: false,
          searching: false,
          data: selectedData
        });

        if (activeTab != "accommodation") {
          $("#" + activeTab + "-show-room-costs-check-wrapper").prop("checked", true);
          $("#" + activeTab + "-show-room-costs-check-wrapper").hide();
        }

        $(".supplier-products-selector").on("change", function() {
          let selectedProduct = $(":selected", this).val();

          const products = $("#view-" + activeTab + "-place-body").data("products");
          if (typeof products == "object") {
            const currentProduct = products.find(product => {
              return product.id == selectedProduct;
            });

            const isChecked = $("#" + activeTab + "-show-room-costs-check").prop("checked");
            const type = isChecked == true ? "cost" : "supp";
            ratesDataTable.clear();
            if (activeTab == "accommodation") {
              if (type == "cost") {
                ratesDataTable.rows.add(currentProduct.costRates);
              } else {
                ratesDataTable.rows.add(currentProduct.suppRates);
              }
            } else {
              ratesDataTable.rows.add(currentProduct.costRates);
            }
            ratesDataTable.draw();
          }
        });

        $(".show-room-costs-check").on("click", function() {
          const isChecked = $(this).prop("checked");
          const type = isChecked == true ? "cost" : "supp";

          let selectedProduct = $("#" + activeTab + "-supplier-products-selector :selected").val();
          const products = $("#view-" + activeTab + "-place-body").data("products");

          ratesDataTable.clear();
          if (typeof products == "object") {
            const currentProduct = products.find(product => {
              return product.id == selectedProduct;
            });
            if (type == "cost") {
              ratesDataTable.rows.add(currentProduct.costRates);
            } else {
              ratesDataTable.rows.add(currentProduct.suppRates);
            }

            ratesDataTable.draw();
          }
        });

        $(".select-service-selector").on("click", function(e) {
          e.preventDefault();
          let selectedProduct = $("#" + activeTab + "-supplier-products-selector :selected").val();
          let tripInfo = tripBuilder.TripInfo();
          let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");

          let startDate = {};
          let endDate = {};

          if (activeTab == "car-rental" || activeTab == "flight") {
            let pickupDate = $("#" + activeTab + "-pick-up-time").data("daterangepicker");
            let dropOffDate = $("#" + activeTab + "-drop-off-time").data("daterangepicker");
            startDate = pickupDate.startDate.format(dateFormat);
            endDate = dropOffDate.startDate.format(dateFormat);
          } else {
            startDate = currentDateRange.startDate.format(dateFormat);
            endDate = currentDateRange.endDate.format(dateFormat);
          }

          let costArray = [];
          if (typeof tripInfo == "object") {
            const products = $("#view-" + activeTab + "-place-body").data("products");
            if (typeof products == "object") {
              const currentProduct = products.find(product => {
                return product.id == selectedProduct;
              });
              UI.clearCurrentService();
              UI.currentService.supplierName = response.org_name;
              UI.currentService.supplierId = response.id;
              UI.currentService.productId = currentProduct.id;
              UI.currentService.productDescription = currentProduct.description;
              UI.currentService.optionData = currentProduct.option;
              UI.currentService.address =
                response.place.street + " " + response.place.suburb + " " + response.place.town;
              UI.currentService.rates = currentProduct.rates;
              currentPlace = response.place;
              renderCost_workinprogress();
              hideSearchResults(activeTab);
            }
          }
        });

        $("#view-" + activeTab + "-place").show();

        UI.previousView = "search-results";
        UI.currentView = "supplier-view";
      }
    });
  });

  $(".search-results-body").on("click", ".select-place", function(e) {
    e.preventDefault();

    let productId = $(this).data("product-id");
    let supplierId = $(this).data("supplier-id");
    let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");
    let startDate = currentDateRange.startDate;
    let endDate = currentDateRange.endDate;
    let agent = tripBuilder.GetAgent();
    if (!agent) {
      alert(
        "Please select an agent before adding services to a booking.\r\nYou can select an agent by editing the trip information."
      );
      return;
    }
    $.ajax({
      type: "post",
      url: "/tripbuilder/product",
      data: {
        id: productId,
        startDate: startDate.format(dateFormat),
        endDate: endDate.format(dateFormat),
        agentId: agent,
        paxCount: tripBuilder.GetPartyCount()
      },
      dataType: "json",
      success: function(response) {
        UI.clearCurrentService();
        UI.currentService.supplierName = response.supplier.org_name;
        UI.currentService.supplierId = response.supplier.id;
        UI.currentService.productId = response.product.id;
        UI.currentService.productDescription = response.product.description;
        UI.currentService.address = response.place.street + " " + response.place.suburb + " " + response.place.town;
        UI.currentService.rates = response.rates;
        UI.currentService.optionData = response.option;

        currentPlace = response.place;
        renderCost_workinprogress();

        $("#" + activeTab + "-supplier").val(currentPlace.place_name);

        hideSearchResults(activeTab);
        UI.previousView == "search-results";
        UI.currentView == "cost-breakdown";
      }
    });
  });

  $("#view-place-body").on("click", ".select-place", function(e) {
    e.preventDefault();

    var placeId = $(this).data("place-id");
    $.ajax({
      type: "post",
      url: "/tripbuilder/place",
      data: {id: placeId},
      dataType: "json",
      success: function(response) {
        currentPlace = response;
        var concatAddress = response.street + " " + response.suburb + " " + response.town;
        $("#accommodation-supplier").val(response.place_name);
        $("#accommodation-location").text(concatAddress);
        $("#view-place").hide();
        $("#destination-search-results-body").html("");
        $("#view-place-body").html("");
        $("#destination-search-form").show();
      }
    });
  });

  $(".view-place-body").on("click", ".select-place-back", function(e) {
    e.preventDefault();
    if (UI.previousView == "cost-breakdown") {
      $("#view-" + activeTab + "place-body").html("");
      $("#view-" + activeTab + "-place").hide();
      $("#" + activeTab + "-search-form").show();
      $("#" + activeTab + "-supplier").val("");
    } else if (UI.previousView == "search-results") {
      $("#view-" + activeTab + "place-body").html("");
      $("#view-" + activeTab + "-place").hide();
      $("#" + activeTab + "-search-results").show();
      $("#" + activeTab + "-search-results-body").show();
    }
  });

  $("#btn-save-budget").on("click", function(e) {
    e.preventDefault();
    let budget = $("#trip-builder-budget").val();
    tripBuilder.SetTotalBudget(budget);
    renderBudgetTotals();
    renderThermometer();
    $("#modal-budget-info").modal("hide");
  });

  $(".view-place-body").on("click", ".thumbnail-preview", function(e) {
    let imageURL = $(this).data("original-image");
    $(".view-place-main-image", "#view-" + activeTab + "-place-body").attr("src", imageURL);
    console.log(imageURL);
  });

  $(".modal-toggle-services-trigger").on("click", function(e) {
    e.preventDefault();
    $(".tooltip").tooltip("hide");
    $(".i-font-tiny").toggleClass("g-onHover-show-grandchild-grandchild");
  });

  $(".return-to-search").on("click", function(e) {
    e.preventDefault();
    $("#" + activeTab + "-destination-select").prop("selectedIndex", 0);
    $("#" + activeTab + "-search-results").hide();
    $("#" + activeTab + "-search-form").show();
  });

  $("#save-booking").on("click", function(e) {
    let data = {};
    const dateFormat = "YYYY-MM-DD HH:mm:ss"; // MySQL date format
    let existingItinerary = tripBuilder.Itinerary();
    const agent = tripBuilder.GetAgent();
    const roomConfigCount = tripBuilder.GetRoomConfigCount();

    /**
     * Perform validation before submitting to the server
     */
    if (existingItinerary.length == 0) {
      alert("You cannot save a booking with an empty itinerary");
      return;
    }
    if (!agent) {
      alert("You cannot save a booking without a selected agent");
      return;
    }
    if (roomConfigCount == 0) {
      alert("You cannot save a booking without setting up the room configuration");
      return;
    }
    if (tripBuilder.TripInfo().partyName == "") {
      alert("You cannot save a booking without a party name");
      return;
    }

    /**
     * Select only the fields that we need we sending off to the server.
     */
    existingItinerary = _.map(
      existingItinerary,
      _.partialRight(_.pick, [
        "data.id",
        "day",
        "endDate",
        "startDate",
        "status",
        "serviceType",
        "data.costing",
        "data.price_code",
        "data.drop_off_date",
        "data.pick_up_date",
        "data.drop_off_location",
        "data.pick_up_location",
        "data.productId",
        "data.destinationId",
        "data.serviceDescription",
        "data.supplier",
        "data.costOverrides",
        "data.remarks",
        "data.optionData.MPFCU"
      ])
    );

    // for (let index = 0; index < existingItinerary.length; index++) {
    //   existingItinerary[index].startDate = existingItinerary[index].startDate.format(dateFormat);
    //   existingItinerary[index].startDate = existingItinerary[index].endDate.format(dateFormat);
    // }
    // return;

    data.itinerary = JSON.parse(JSON.stringify(existingItinerary));

    data.tripInfo = tripBuilder.TripInfo();
    data.agent = tripBuilder.GetAgent();
    data.Pax = tripBuilder.Pax();
    data.budget = tripBuilder.GetTotalBudget();
    data.bookingStatus = tripBuilder.GetBookingStatus();
    // Append the travel and departure dates to the trip info object.
    data.tripInfo.travel_date = tripBuilder.GetStartDate().format(dateFormat);
    data.tripInfo.departure_date = tripBuilder.GetEndDate().format(dateFormat);

    data.booking_reference = getQueryVariable("ref");

    let roomConfig = tripBuilder.GetRoomConfig(1);
    let roomArray = roomConfig.getAllRooms();
    let rooms = [];

    for (const room of roomArray) {
      rooms.push({
        id: room.id,
        type: room.type,
        adultPax: room.adultPax,
        childrenPax: room.childrenPax,
        infantPax: room.infantPax,
        adults: room.adults,
        children: room.children,
        infants: room.infants,
        name: room.name,
        pax: room.pax
      });
    }

    data.roomConfig = rooms;
    $("#save-booking-progress").css("width", "0%");

    if (BookingState.isExistingBooking == true) {
      $.ajax({
        type: "post",
        url: "/tripbuilder/updateBooking",
        data: data,
        dataType: "json",

        success: function(response) {
          alert("Booking has been updated!");
        }
      });
    } else {
      $("#modal-saving-booking").modal("show");
      $.ajax({
        type: "post",
        url: "/tripbuilder/saveBooking",
        data: data,
        dataType: "json",
        xhr: function() {
          var xhr = new window.XMLHttpRequest();
          xhr.upload.addEventListener(
            "progress",
            function(evt) {
              if (evt.lengthComputable) {
                var percentComplete = (evt.loaded / evt.total) * 100;
                $("#save-booking-progress").css("width", percentComplete + "%");
              }
            },
            false
          );

          //Download progress
          xhr.addEventListener(
            "progress",
            function(evt) {
              if (evt.lengthComputable) {
                var percentComplete = (evt.loaded / evt.total) * 100;
                $("#save-booking-progress").css("width", percentComplete + "%");
              }
            },
            false
          );
          return xhr;
        },
        success: function(response) {
          // console.log(response);
          $("#saving-booking-progress-wrapper").hide();
          $("#saving-booking-results-text").html(
            `Booking has been saved! The reference number is:<h3>${response.booking_reference}</h3><br />`
          );
          $("#saving-booking-results-url").attr("href", "/tripbuilder/bookings/view/" + response.booking_reference);
          $("#saving-booking-results").modal("show");

          // window.location = "/tripbuilder/bookings";
          return;
        }
      });
    }
  });

  $("#modal-create-pcm").on("shown.bs.modal", function() {
    let tripInfo = tripBuilder.TripInfo();
    if (!jQuery.isEmptyObject(tripInfo)) {
      $("#package-adults").val(tripInfo.partyCount.adults);
      $("#package-children").val(tripInfo.partyCount.children);
      $("#package-infants").val(tripInfo.partyCount.infants);

      $("#package-rooms-single").val(tripInfo.partyRooms.singles);
      $("#package-rooms-double").val(tripInfo.partyRooms.doubles);
      $("#package-rooms-triple").val(tripInfo.partyRooms.triples);
      $("#package-rooms-family").val(tripInfo.partyRooms.family);
    } else {
      $("#package-adults").val(0);
      $("#package-children").val(0);
      $("#package-infants").val(0);
    }
  });

  $("#save-package").on("click", function() {
    let data = {};
    let dateFormat = "YYYY-MM-DD HH:mm:ss"; // MySQL date format
    let existingItinerary = tripBuilder.Itinerary();
    const roomConfigCount = tripBuilder.GetRoomConfigCount();

    /**
     * Perform validation before submitting to the server
     */
    if (existingItinerary.length == 0) {
      alert("You cannot save a package with an empty itinerary");
      return;
    }

    if (roomConfigCount == 0) {
      alert("You cannot save a package without setting up the room configuration");
      return;
    }

    if (tripBuilder.TripInfo().partyName == "") {
      alert("You cannot save a packge without a package name");
      return;
    }

    /**
     * Select only the fields that we need we sending off to the server.
     */
    existingItinerary = _.map(
      existingItinerary,
      _.partialRight(_.pick, [
        "data.id",
        "day",
        "endDate",
        "startDate",
        "status",
        "serviceType",
        "data.costing",
        "data.price_code",
        "data.drop_off_date",
        "data.pick_up_date",
        "data.drop_off_location",
        "data.pick_up_location",
        "data.productId",
        "data.destinationId",
        "data.serviceDescription",
        "data.supplier",
        "data.costOverrides",
        "data.remarks"
      ])
    );

    data.itinerary = JSON.parse(JSON.stringify(existingItinerary));

    data.tripInfo = tripBuilder.TripInfo();
    data.Pax = tripBuilder.Pax();

    // Append the travel and departure dates to the trip info object.
    data.tripInfo.valid_from_date = tripBuilder.GetValidDateRange().startDate.format(dateFormat);
    data.tripInfo.valid_to_date = tripBuilder.GetValidDateRange().endDate.format(dateFormat);
    data.tripInfo.package_start_date = tripBuilder.GetStartDate().format(dateFormat);
    data.tripInfo.package_end_date = tripBuilder.GetEndDate().format(dateFormat);
    data.tripInfo.price_code = tripBuilder.GetPriceCode();
    data.tripInfo.markup = tripBuilder.GetMarkUp();
    let roomConfig = tripBuilder.GetRoomConfig(1);
    let roomArray = roomConfig.getAllRooms();
    let rooms = [];

    for (const room of roomArray) {
      rooms.push({
        id: room.id,
        type: room.type,
        adultPax: room.adultPax,
        childrenPax: room.childrenPax,
        infantPax: room.infantPax,
        adults: room.adults,
        children: room.children,
        infants: room.infants,
        name: room.name,
        pax: room.pax
      });
    }

    data.roomConfig = rooms;
    $("#modal-saving-package").modal("show");
    $("#save-package-progress").css("width", "0%");
    $.ajax({
      type: "post",
      url: "/tripbuilder/savePackage",
      data: data,
      dataType: "json",
      xhr: function() {
        var xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener(
          "progress",
          function(evt) {
            if (evt.lengthComputable) {
              var percentComplete = (evt.loaded / evt.total) * 100;
              $("#save-package-progress").css("width", percentComplete + "%");
            }
          },
          false
        );

        //Download progress
        xhr.addEventListener(
          "progress",
          function(evt) {
            if (evt.lengthComputable) {
              var percentComplete = (evt.loaded / evt.total) * 100;
              $("#save-package-progress").css("width", percentComplete + "%");
            }
          },
          false
        );
        return xhr;
      },
      success: function(response) {
        console.log(response);
        $("#saving-package-progress-wrapper").hide();
        $("#saving-package-results-text").html(`<h3>Package has been saved!</h3><br />`);
        // $("#saving-booking-results-url").attr("href", "/tripbuilder/bookings/view/" + response.booking_reference);
        $("#saving-package-results").show();
        return;
      }
    });
  });

  $("#entity_name").autocomplete({
    serviceUrl: "/tripbuilder/entitySearch",
    onSelect: function(suggestion) {
      $("#entity_name").data("entity-id", suggestion.data);
    }
  });

  $("#trip-party-add-entity").on("click", function() {
    let entityId = $("#entity_name").data("entity-id");

    if ("undefined" !== typeof entityId) {
      $.ajax({
        type: "POST",
        url: "/tripbuilder/getEntityInfo",
        data: {id: entityId},
        dataType: "json",
        success: function(response) {
          $("#no-travellers").hide();

          TRIP_PAX.push(response.entity);
          let tableRow = `<tr data-pax-id="${response.entity.id}"><td>${response.entity.first_name}</td><td>${
            response.entity.last_name
          }</td><td class="text-right"><button class="btn btn-danger btn-sm remove-traveller" type="button">X</button></td></tr>`;
          $("#traveller-list").append(tableRow);
          $("#entity_name").val("");
          $("#entity_name").removeData("entity-id");
        }
      });
    }
  });

  $("#modal-trip-info").on("hidden.bs.modal", function() {
    $("#edit-trip-info-form")[0].reset();
    $("#children-ages-select").html("");
    $("#traveller-list tbody > tr")
      .not("#no-travellers")
      .remove();
    $("#no-travellers").show();
  });

  $("#traveller-list").on("click", ".remove-traveller", function(e) {
    e.preventDefault();
    let paxId = $(this)
      .parent()
      .parent()
      .data("pax-id");
    tripBuilder.RemovePax(paxId);

    $(this)
      .parent()
      .parent()
      .remove();
    let rowCount = $("#traveller-list > tbody > tr").length;
    if (rowCount == 1) {
      $("#no-travellers").show();
    }
  });

  $("#btn-save-trip-info").on("click", function(e) {
    e.preventDefault();

    let tripInfo = tripBuilder.TripInfo();

    let partyName = $("#trip-party-name").val();

    let agent = $("#edit-trip-info-agent option:selected").val();
    let status = $("#edit-trip-info-status option:selected").val();

    /**
     * If you are editing a package, save the year this package is valid
     * and the price code.
     */
    if (builderMode == "packagebuilder") {
      let validDateRange = $("#package-valid-date-range").data("daterangepicker");
      let priceCode = $("#edit-trip-info-price-code option:selected").val();
      let markup = $("#edit-trip-info-markup").val();
      tripBuilder.SetMarkup(parseFloat(markup));
      tripBuilder.SetValidDateRange(validDateRange);
      tripBuilder.SetPriceCode(priceCode);
    }

    tripBuilder.SetAgent(agent);
    tripBuilder.SetBookingStatus(status);

    tripInfo.partyName = partyName;

    let budget = $("#edit-trip-info-budget").val();
    budget = isNaN(parseFloat(budget)) ? 0 : budget;

    tripBuilder.SetTotalBudget(budget);

    tripBuilder.AddTripInfo(tripInfo);

    tripBuilder.ClearPax();
    tripBuilder.AddPaxArray(TRIP_PAX);

    renderTripInfo();
    if (tripBuilder.GetTotalBudget() > 0) {
      renderBudgetTotals();
      renderThermometer();
    }
    $("#modal-trip-info").modal("hide");
  });

  /**
   *
   */
  $("#toggle-donation-meter").on("click", function(e) {
    e.preventDefault();
    let thermometerIsVisible = $("#thermometer-view").is(":visible");
    let viewWidth = thermometerIsVisible ? "col-md-12" : "col-md-9";
    let icon = thermometerIsVisible ? "icon-circle-with-plus" : "icon-circle-with-minus";

    $("#trip-days-view").removeClass();
    $("#trip-days-view").addClass(viewWidth);
    if (thermometerIsVisible) {
      $("#thermometer-view").hide();
    } else {
      $("#thermometer-view").show();
    }
    $("#toggle-donation-meter span").removeClass();
    $("#toggle-donation-meter span").addClass(icon);
  });

  $(".service-status-dropdown").on("change", function(e) {
    const status = $(this)
      .val()
      .toLowerCase();
    const label = $(this).val();
    const tab = $(this).data("tab");
    const tabId = "#" + tab + "-service-line-status";
    $(tabId)
      .attr("class", "")
      .addClass("service-line-" + status);
    $(tabId).html(label);
  });

  $(".cost-breakdown-table").on("click", ".remove-room", function(e) {
    e.preventDefault();
    const roomId = $(this).data("room");
    if (UI.currentCostRooms.length > 0) {
      const index = UI.currentCostRooms.indexOf(roomId);
      UI.currentCostRooms.splice(index, 1);
      renderCost_workinprogress();
    }
  });

  $(".edit-cost-breakdown-table").on("click", ".remove-room", function(e) {
    e.preventDefault();
    const roomId = $(this).data("room");
    if (UI.currentCostRooms.length > 0) {
      const index = UI.currentCostRooms.indexOf(roomId);
      UI.currentCostRooms.splice(index, 1);
      renderCost_workinprogress(true);
    }
  });

  $(".cost-breakdown-table").on("click", ".remove-pax", function(e) {
    e.preventDefault();
    const paxId = $(this).data("pax");
    const roomId = $(this).data("room");
    if (UI.currentCostPax.length > 0) {
      let selectedIndex = -1;
      for (let index = 0; index < UI.currentCostPax.length; index++) {
        if (UI.currentCostPax[index].roomId == roomId && UI.currentCostPax[index].paxId == paxId) {
          selectedIndex = index;
          break;
        }
      }
      UI.currentCostPax.splice(selectedIndex, 1);
      renderCost_workinprogress();
    }
  });

  $(".edit-cost-breakdown-table").on("click", ".remove-pax", function(e) {
    e.preventDefault();
    const paxId = $(this).data("pax");
    const roomId = $(this).data("room");
    if (UI.currentCostPax.length > 0) {
      let selectedIndex = -1;
      for (let index = 0; index < UI.currentCostPax.length; index++) {
        if (UI.currentCostPax[index].roomId == roomId && UI.currentCostPax[index].paxId == paxId) {
          selectedIndex = index;
          break;
        }
      }
      UI.currentCostPax.splice(selectedIndex, 1);
      renderCost_workinprogress();
    }
  });

  $(document).on("change", "#markup-calculation-table input[type='text']", function() {
    let fieldType = $(this).data("field");
    let service = $(this).data("service-id");
    let costValue = parseFloat($("input#cost_amount_" + service).val());
    let unitCostValue = parseFloat($("input#unit_cost_amount_" + service).val());
    let markupValue = 0;
    let newSellValue = 0;
    let markupPercentage = 0;
    // let newUnitCost = 0;
    let oldValue = 0;
    let newValue = 0;
    if (fieldType == "cost-value") {
      costValue = parseFloat($(this).val());
      newValue = costValue;
      oldValue = BookingState.costingTotals[service].costAmount;

      markupValue = parseFloat($("input#markup_amount_" + service).val());
      newSellValue = parseFloat(costValue + markupValue);
      markupPercentage = costValue == 0 ? 0 : ((newSellValue - costValue) / costValue) * 100;
      $("input#cost_amount_" + service).val(costValue);
      let parentRow = $(this)
        .parent()
        .parent();
      let nextRowAfterParent = $(parentRow).next("tr");
      if (!$(nextRowAfterParent).hasClass("cost-update-reason")) {
        let parentRowIndex = $(parentRow).index();
        let newRow = document.createElement("tr");
        newRow.classList.add("cost-update-reason");
        newRow.innerHTML = `
                          <td colspan="5"></td>
                          <td colspan="5">
                          <div class="row">
                          <form>
                            <div class="col-md-6">                              
                              <strong>Cost overridden</strong><br>
                              <div class="input-group" style="margin-left: -4px;">
                                  <span class="input-group-addon"><b>Reason</b></span>
                                  <select name="" class="form-control" id="cost-overridden-reason" style="margin-left: -5px;">           
                                      <option disabled="" selected>Select a reason</option>
                                      <option val="Zero Cost Override">Zero Cost Override</option>
                                      <option val="Over charging">Over charging</option>
                                      <option val="Under charging">Under charging</option>
                                      <option val="Vat Amendment">Vat Amendment</option>
                                      <option val="Other">Other</option>
                                  </select> <br />                                  
                              </div>
                              <input type="text" class="form-control" style="margin-top: 5px; display:none;" id="cost-overridden-other-reason"/>
                            </div>
                            <div class="col-md-6">
                              <button class="btn btn-success" value="" data-service-id="${service}" style="margin-top: 24px;" id="save-overridden-reason">Save</button>
                            </div>
                          </div>
                          </form>
                          <div class="row">
                            <div class="col-md-6">
                              
                            </div>
                          </div>
                         </td>
      `;
        $("#markup-calculation-table tr:eq(" + parentRowIndex + ")").after(newRow);
      }
    } else if (fieldType == "markup-value") {
      markupValue = parseFloat($(this).val());
      oldValue = BookingState.costingTotals[service].markupAmount;
      newValue = markupValue;
      newSellValue = parseFloat(costValue + markupValue);
      markupPercentage = costValue == 0 ? 0 : ((newSellValue - costValue) / costValue) * 100;
    } else if (fieldType == "markup-percentage") {
      markupPercentage = parseFloat($(this).val());
      oldValue = BookingState.costingTotals[service].markupPercentage;
      newValue = markupPercentage;
      newSellValue = costValue == 0 ? 0 : parseFloat(costValue + (costValue * markupPercentage) / 100);
      markupValue = parseFloat(newSellValue - costValue);
    } else if (fieldType == "sell-price") {
      newSellValue = parseFloat($(this).val());
      oldValue = BookingState.costingTotals[service].sellAmount;
      newValue = newSellValue;
      markupValue = costValue == 0 ? 0 : parseFloat(newSellValue - costValue);
      markupPercentage = costValue == 0 ? 0 : ((newSellValue - costValue) / costValue) * 100;
    }

    // // Round up and limit to two decimal places.
    // markupValue = parseFloat(markupValue.toFixed(2));
    // markupPercentage = parseFloat(markupPercentage.toFixed(2));

    let selectedService = tripBuilder.GetService(BookingState.costingTotals[service].id);
    let serviceStartDate = moment(selectedService.startDate);
    let serviceEndDate = moment(selectedService.endDate);

    let oldServiceStartDate = moment(selectedService.startDate);
    let oldServiceEndDate = moment(selectedService.endDate);
    let oldServiceDayCount = oldServiceEndDate.diff(oldServiceStartDate.startOf("day"), "days");

    let numberOfDays = serviceEndDate.diff(serviceStartDate, "days");
    if (numberOfDays == 0) {
      numberOfDays = 1;
    }
    let newSellRate = newSellValue / numberOfDays;
    let newCostRate = costValue / numberOfDays;
    let totalScu = 0;
    if (activeTab == "accommodation" || activeTab == "car-rental") {
      totalScu = selectedService.data.costing.length;
    } else {
      totalScu = _.sumBy(selectedService.data.costing, "totalPax");
    }

    let newUnitCost = costValue / totalScu / numberOfDays;
    let newUnitSell = newSellValue / totalScu / numberOfDays;

    /**
     * Create an override object for this service line and then update the services costs as we go along.
     *
     */
    let overridesObject = {
      fieldType: fieldType,
      oldValue: oldValue,
      newValue: newValue
    };

    tripBuilder.AddServiceCostOverride(BookingState.costingTotals[service].id, overridesObject);

    BookingState.costingTotals[service].costAmount = costValue;
    BookingState.costingTotals[service].sellAmount = newSellValue;
    BookingState.costingTotals[service].unitCost = newUnitCost;
    BookingState.costingTotals[service].unitSell = newUnitSell;
    BookingState.costingTotals[service].agentAmount = newSellValue;
    BookingState.costingTotals[service].markupPercentage = markupPercentage;
    BookingState.costingTotals[service].markupAmount = markupValue;

    for (let index = 0; index < BookingState.costingTotals.length; index++) {
      const row = BookingState.costingTotals[index];
      $("#cost_amount_" + index).val(row.costAmount.toFixed(2));
      $("#markup_amount_" + index).val(row.markupAmount.toFixed(2));
      $("#markup_percentage_" + index).val(row.markupPercentage.toFixed(2));
      $("#sell_amount_" + index).val(row.sellAmount.toFixed(2));
      $("#agent_amount_" + index).val(row.agentAmount.toFixed(2));
    }

    /**
     * Calculate the total costs/sell/agent prices
     */
    let totalCost = BookingState.costingTotals
      .map(e => parseFloat(e.costAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    let totalSell = BookingState.costingTotals
      .map(e => parseFloat(e.sellAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    let totalAgent = BookingState.costingTotals
      .map(e => parseFloat(e.agentAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    let totalMarkup = BookingState.costingTotals
      .map(e => parseFloat(e.markupAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });
    let totalMarkupPercentage = totalCost == 0 ? 0 : ((totalSell - totalCost) / totalCost) * 100;
    totalMarkupPercentage = isNaN(totalMarkupPercentage) ? 0 : totalMarkupPercentage;

    $("#total-cost-value").val(totalCost.toFixed(2));
    $("#total-markup-value").val(totalMarkup.toFixed(2));
    $("#total-markup-percentage").val(totalMarkupPercentage.toFixed(2));
    $("#total-sell-amount").val(totalSell.toFixed(2));
    $("#total-agent-amount").val(totalAgent.toFixed(2));

    $("#costing-sheet-total-cost").html(totalCost.toFixed(2));
    $("#costing-sheet-total-markup").html(totalMarkup.toFixed(2));
    $("#costing-sheet-total-markup-percentage").html(totalMarkupPercentage.toFixed(2));
    $("#costing-sheet-total-retail").html(totalSell.toFixed(2));
    $("#cost_amount_view_" + service).html(newUnitCost.toFixed(2));
    $("#unit_cost_amount_" + service).val(newUnitCost.toFixed(2));
    selectedService.data.supplier.place.sellRate = newSellRate;
    selectedService.data.supplier.place.agentRate = newSellRate;
    selectedService.data.supplier.place.costRate = newCostRate;

    /**
     * Update the costing table for this service
     */
    for (let index = 0; index < selectedService.data.costing.length; index++) {
      selectedService.data.costing[index].unitCost = newUnitCost;
      selectedService.data.costing[index].unitSell = newUnitSell;
      selectedService.data.costing[index].costRate = newCostRate;
      selectedService.data.costing[index].agentRate = newSellRate;
      selectedService.data.costing[index].sellRate = newSellRate;
      selectedService.data.costing[index].total = (newSellRate * numberOfDays) / totalScu;
    }

    tripBuilder.UpdateService(
      selectedService.serviceId,
      selectedService.serviceType,
      selectedService.day,
      selectedService.status,
      moment(selectedService.startDate),
      moment(selectedService.endDate),
      oldServiceStartDate,
      oldServiceEndDate,
      selectedService.data
    );

    let parentCostingRow = $(this).closest("tr");
    updateCostingSheetRowFields(selectedService.serviceId, parentCostingRow);
    // renderBudgetTotals();
    // renderThermometer();
  });

  $(document).on("click", "#markup-calculation-table tbody tr td #save-overridden-reason", function(e) {
    e.preventDefault();
    let reason = $("#cost-overridden-reason").val();
    let serviceId = $(this).data("service-id");
    let otherReason = null;

    if (reason == null) {
      alert("Please select a reason for overriding the costs");
      return;
    } else if (reason == "Other") {
      otherReason = $("#cost-overridden-other-reason").val();
      if (otherReason == "") {
        alert("Please enter in a reason for the cost override");
        return;
      }
    }
    let selectedService = tripBuilder.GetService(BookingState.costingTotals[serviceId].id);
    // selectedService.data.costing[0].overrides = {
    //   cost: 100
    // };
    for (let costingOverride of selectedService.data.costOverrides) {
      if (costingOverride.fieldType == "cost-value") {
        costingOverride.cost_override_reason = reason;
        if (otherReason) {
          costingOverride.cost_override_reason_text = otherReason;
        }
      }
    }
    $(this)
      .closest(".cost-update-reason")
      .remove();
  });

  $(document).on("change", "#cost-overridden-reason", function(e) {
    e.preventDefault();
    let selectedValue = $(this).val();
    if (selectedValue == "Other") {
      $("#cost-overridden-other-reason").show();
    }
  });

  $("#room-overview").on("click", ".delete-room-config", function(e) {
    e.preventDefault();
    let roomId = $(this).data("room-id");
    let roomConfig = tripBuilder.GetRoomConfig(1);
    roomConfig.removeRoom(roomId);
    renderRoomConfigurations();
  });

  $(document).on("click", "#save-booking-notes-button", function(e) {
    if (BookingState.isExistingBooking) {
      let bookingData = {
        booking_note: $("#booking-notes-text").val(),
        booking_reference: BookingState.existingReferenceNumber
      };
      $("#saving-booking-notes-wrapper").show();
      $.ajax({
        type: "post",
        url: "/tripbuilder/saveBookingNote",
        data: bookingData,
        dataType: "json",
        success: function(response) {
          tripBuilder.SetBookingNotes(bookingData.booking_note);
          $("#saving-booking-notes-wrapper").hide();
        }
      });
    } else {
      tripBuilder.SetBookingNotes($("#booking-notes-text").val());
    }
  });
  /**
   * TripBuilder initialization
   */
  renderBudgetTotals();
  renderThermometer();
});

function renderSupplierRatesAndDetails(supplierInformation, activeTab) {
  var source = document.getElementById("place-template").innerHTML;
  var template = Handlebars.compile(source);
  supplierInformation.activeTab = activeTab;
  if (activeTab == "car-rental") {
    for (let index = 0; index < supplierInformation.products.length; index++) {
      supplierInformation.products[index].name = supplierInformation.products[index].description;
    }
  }

  var html = template(supplierInformation);
  $("#view-" + activeTab + "-place-body").html(html);

  if ($.fn.DataTable.isDataTable("#" + activeTab + "-supplier-rates-table")) {
    $("#" + activeTab + "-supplier-rates-table")
      .DataTable()
      .clear()
      .destroy();
  }
  $("#view-" + activeTab + "-place-body").data("products", supplierInformation.products);

  let selectedData =
    activeTab == "accommodation"
      ? supplierInformation.products[0].suppRates
      : supplierInformation.products[0].costRates;

  if (activeTab != "accommodation") {
    $("#" + activeTab + "-show-room-costs-check-wrapper").prop("checked", true);
    $("#" + activeTab + "-show-room-costs-check-wrapper").hide();
  }

  UI.currentService.supplierName = supplierInformation.org_name;
  UI.currentService.supplierId = supplierInformation.id;
  UI.currentService.address =
    supplierInformation.place.street + " " + supplierInformation.place.suburb + " " + supplierInformation.place.town;
  let ratesDataTable = $("#" + activeTab + "-supplier-rates-table").DataTable({
    paging: false,
    ordering: false,
    info: false,
    searching: false,
    data: selectedData
  });

  $(".supplier-products-selector").on("change", function() {
    let selectedProduct = $(":selected", this).val();

    const products = $("#view-" + activeTab + "-place-body").data("products");
    if (typeof products == "object") {
      const currentProduct = products.find(product => {
        return product.id == selectedProduct;
      });

      UI.currentService.productId = currentProduct.id;
      UI.currentService.productDescription = currentProduct.description;
      UI.currentService.optionData = currentProduct.option;

      const isChecked = $("#" + activeTab + "-show-room-costs-check").prop("checked");
      const type = isChecked == true ? "cost" : "supp";
      ratesDataTable.clear();

      if (activeTab == "accommodation") {
        if (type == "cost") {
          ratesDataTable.rows.add(currentProduct.costRates);
        } else {
          ratesDataTable.rows.add(currentProduct.suppRates);
        }
      } else {
        ratesDataTable.rows.add(currentProduct.costRates);
      }

      ratesDataTable.draw();
    }
  });

  $(".show-room-costs-check").on("click", function() {
    const isChecked = $(this).prop("checked");
    const type = isChecked == true ? "cost" : "supp";

    let selectedProduct = $("#" + activeTab + "-supplier-products-selector :selected").val();
    const products = $("#view-" + activeTab + "-place-body").data("products");

    ratesDataTable.clear();
    if (typeof products == "object") {
      const currentProduct = products.find(product => {
        return product.id == selectedProduct;
      });
      if (type == "cost") {
        ratesDataTable.rows.add(currentProduct.costRates);
      } else {
        ratesDataTable.rows.add(currentProduct.suppRates);
      }

      ratesDataTable.draw();
    }
  });

  $(".select-service-selector").on("click", function(e) {
    e.preventDefault();
    let selectedProduct = $("#" + activeTab + "-supplier-products-selector :selected").val();
    let tripInfo = tripBuilder.TripInfo();
    let currentDateRange = $("#" + activeTab + "-pick-up-drop-off").data("daterangepicker");
    let startDate = {};
    let endDate = {};

    if (activeTab == "car-rental" || activeTab == "flight") {
      let pickupDate = $("#" + activeTab + "-pick-up-time").data("daterangepicker");
      let dropOffDate = $("#" + activeTab + "-drop-off-time").data("daterangepicker");
      startDate = pickupDate.startDate.format(dateFormat);
      endDate = dropOffDate.startDate.format(dateFormat);
    } else {
      startDate = currentDateRange.startDate.format(dateFormat);
      endDate = currentDateRange.endDate.format(dateFormat);
    }

    let costArray = [];
    if (typeof tripInfo == "object") {
      const products = $("#view-" + activeTab + "-place-body").data("products");
      if (typeof products == "object") {
        const currentProduct = products.find(product => {
          return product.id == selectedProduct;
        });
        // UI.clearCurrentService();

        UI.currentService.productId = currentProduct.id;
        UI.currentService.productDescription = currentProduct.description;
        UI.currentService.rates = currentProduct.rates;
        UI.currentService.optionData = currentProduct.option;

        currentPlace = supplierInformation.place;
        renderCost_workinprogress();
        hideSearchResults(activeTab);
      }
    }
  });

  $("#view-" + activeTab + "-place").show();
}

function hideSearchResults(currentTab) {
  $("#view-" + currentTab + "-place").hide("fast", function() {
    $(".search-results").hide();
    $("#view-" + currentTab + "-place-body").html("");
    $("#" + currentTab + "-search-results-body-table")
      .DataTable()
      .clear()
      .destroy();
    $("#" + currentTab + "-search-form").fadeIn("fast");
  });
}

function renderCostBreakDown(
  currentTab,
  supplierName,
  supplierId,
  productId,
  supplierAddress,
  costArray,
  rates,
  productDescription,
  isEdit = false
) {
  let sellRate = 0;
  let costRate = 0;
  let agentRate = 0;
  let grandTotal = 0;
  let costHTML = `<tr ><td colspan="3" style="border-top-width: 0px;color: #333;">${supplierName}</td></tr>`;

  costArray = Array.isArray(costArray) ? costArray : [costArray];

  for (var el in costArray) {
    if (costArray.hasOwnProperty(el)) {
      grandTotal += parseFloat(costArray[el].total);
      sellRate += parseFloat(costArray[el].sellRate);
      costRate += parseFloat(costArray[el].costRate);
      agentRate += parseFloat(costArray[el].agentRate);
    }
  }

  currentPlace.sellRate = sellRate;
  currentPlace.costRate = costRate;
  currentPlace.agentRate = agentRate;

  if (currentTab == "accommodation") {
    for (const key in costArray) {
      costHTML += `<tr style="font-size: 12px;"><td>${costArray[key].desc}</td><td class="text-right">${costArray[
        key
      ].total.toFixed(2)}</td><td><button type="button" class="close remove-room" data-room="${
        costArray[key].rooms[0].roomId
      }"><span aria-hidden="true">×</span></button></td></tr >`;
    }
  } else {
    for (const key in costArray) {
      if (costArray[key].hasOwnProperty("roomId") && costArray[key].hasOwnProperty("pax")) {
        costHTML += `<tr style="font-size: 12px;"><td>${costArray[key].desc}</td><td class="text-right">${costArray[
          key
        ].total.toFixed(2)}</td><td><button type="button" class="close remove-pax" data-room="${
          costArray[key].roomId
        }" data-pax="${costArray[key].paxId}"><span aria-hidden="true">×</span></button></td></tr >`;
      } else {
        costHTML += `<tr style="font-size: 12px;"><td>${costArray[key].desc}</td><td class="text-right">${costArray[
          key
        ].total.toFixed(2)}</td><td><button type="button" class="close remove-pax" data-room="${
          costArray[key].roomId
        }"><span aria-hidden="true">×</span></button></td></tr >`;
      }
    }
  }

  costHTML += `<tr><td><strong>Total (in ZAR)</strong></td><td class="text-right"><strong>${grandTotal.toFixed(
    2
  )}</strong></td><td></td></tr>`;

  currentTab = isEdit ? `edit-${currentTab}` : currentTab;
  $("#" + currentTab + "-cost-breakdown")
    .empty()
    .html(costHTML);

  $("#" + currentTab + "-supplier").data("supplier-id", supplierId);
  $("#" + currentTab + "-supplier").data("product-id", productId);
  $("#" + currentTab + "-supplier").data("product-description", productDescription);
  $("#" + currentTab + "-supplier").data("rates-table", rates);
  $("#" + currentTab + "-supplier").data("supplier-name", supplierName);
  $("#" + currentTab + "-supplier").data("serviceRate", sellRate);
  $("#" + currentTab + "-supplier").data("costRate", costRate);
  $("#" + currentTab + "-supplier").data("agentRate", agentRate);
  $("#" + currentTab + "-location").val(supplierAddress);
  $("#" + currentTab + "-type").val(productDescription);

  /**
   * mobx
   */
  UI.currentService.costBreakDown = costArray;
}

/**
 * Renders service blocks for a service.
 *
 * @param int serviceId
 * @param int day
 * @param string serviceType
 * @param DateTime startDate
 * @param DateTime endDate
 */
function renderServiceTags(serviceId, day, serviceType, startDate, endDate) {
  let startHour = startDate.hour();
  let startMinute = startDate.minute();
  let multiDayHeight = 60;
  let startingPoint = (startHour + startMinute / multiDayHeight) * hourHeight;
  let serviceTime = 120;

  let startingPointHeight = minuteHeight * serviceTime; // 30 Minutes for now

  if (!moment(startDate).isSame(endDate, "day")) {
    let dateDifference = Math.round(endDate.diff(startDate, "days", true));
    let minuteDifference = endDate.diff(startDate, "minutes");

    if (Math.ceil(dateDifference) >= 1) {
      /**
       * This is to handle multi day events
       */
      let currentDate = moment(startDate);
      let currentDay = day;

      /**
       * Render the service block at the bottom of the day block for each day of the stay.
       */
      while (currentDate.isSameOrBefore(endDate, "day")) {
        /**
         * isLastDay is any obsolete variable which was used to check if the current iterated day is the departure day of the service,
         * however this check is no longer needed so I will remove it later on.
         */
        let isLastDay = currentDate.isSame(endDate, "day");
        let endService = createServiceTag(serviceId, serviceType, multiDayHeight, 0, true, true, isLastDay);
        $('.g-d-inline[data-day="' + currentDay + '"] > .modal-add-event-trigger > .multiday-holder-bottom').append(
          endService
        );

        currentDate.add(1, "days");
        currentDay++;
      }
    } else if (minuteDifference > 1) {
      serviceTime = minuteDifference;
      startingPointHeight = minuteHeight * serviceTime;
      let serviceTag = createServiceTag(serviceId, serviceType, startingPointHeight, startingPoint, true);
      $('.g-d-inline[data-day="' + day + '"] > .modal-add-event-trigger').append(serviceTag);
    }
  } else {
    /**
     * If the tag that needs to rendered will only appear on one day, render it without generating
     * any other follow up tags.
     */
    let serviceTag = createServiceTag(serviceId, serviceType, startingPointHeight, startingPoint, true);
    $('.g-d-inline[data-day="' + day + '"] > .modal-add-event-trigger').append(serviceTag);
  }
}

/**
 * Function used to create service tag for a specified day and service type.
 * @param int serviceId
 * @param string serviceType
 * @param int height
 * @param int top
 * @param string showDescription
 */
function createServiceTag(
  serviceId,
  serviceType,
  height,
  top,
  showDescription = false,
  multiDay = false,
  isLastDay = false
) {
  var element = document.createElement("div");
  // var colour = "g-bgcolor-alpha-" + serviceColours[serviceType];
  var colour = "g-bg-color-" + serviceType;
  var iconClass = "g-pseudo-" + serviceType;
  element.setAttribute("data-service-id", serviceId);
  element.classList.add(
    "g-pseudo",
    "modal-edit-event-trigger",
    "g-onHover-showChild-grandparent",

    "g-width150px",
    "pad-5px",
    iconClass,
    colour,
    "created"
  );

  if (multiDay == false) {
    element.classList.add("g-positionAbs");
    element.style.height = height + "px";
    if (height + top < dayHeight) {
      element.style.top = top + "px";
    } else {
      top = dayHeight - height;
      element.style.top = top + "px";
    }
  }

  if (showDescription == true) {
    let serviceDescription = "";
    let currentService = tripBuilder.GetService(serviceId);

    if (serviceType == "accommodation") {
      serviceDescription = isLastDay ? "Departure" : currentService.data.supplier.org_name;
    } else if (serviceType == "excursion") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "meet-greet") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "transfer") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "meal") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "day-pass") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "entrance-fee") {
      serviceDescription = currentService.data.supplier.org_name;
    } else if (serviceType == "car-rental") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = currentService.data.supplier.org_name;
    } else if (serviceType == "flight") {
      let pickUpTime = moment(currentService.data.pick_up_date).format("h:mm");
      serviceDescription = pickUpTime + " " + currentService.data.supplier.org_name;
    } else if (serviceType == "own-arrangement") {
      serviceDescription = currentService.data.serviceDescription;
    }

    serviceDescription =
      serviceDescription.length > 30 ? serviceDescription.substr(0, 30 - 3) + "..." : serviceDescription;

    let serviceDescriptionTag = createServiceDescriptionTag(serviceType, serviceDescription);
    element.appendChild(serviceDescriptionTag);
  }

  if (serviceType == "accommodation") {
    let serviceCount = tripBuilder.GetServiceCount(serviceType);
    if (serviceCount > 1) {
      let alpha = 0.5 + serviceCount * 0.1;
      // element.style.backgroundColor = "background-color: hsl(260, 60%, 82%);" + alpha + ")";
      element.style.backgroundColor = "rgba(147,112,219," + alpha + ")";
    }
  }

  return element;
}

/**
 *
 * @param string serviceType
 * @param string description
 */
function createServiceDescriptionTag(serviceType, description) {
  let element = document.createElement("div");
  let textColour = "";
  switch (serviceType) {
    case "accommodation":
      textColour = "white";
      break;
    case "excursion":
      textColour = "dark-grey";
      break;
    case "meet-greet":
      textColour = "dark-grey";
      break;
    case "transfer":
      textColour = "white";
      break;
    case "car-rental":
      textColour = "white";
      break;
    case "flight":
      textColour = "white";
      break;
    case "meal":
      textColour = "white";
      break;
    case "own-arrangement":
      textColour = "dark-grey";
      break;
    case "day-pass":
      textColour = "white";
      break;
    case "entrance-fee":
      textColour = "white";
      break;
    default:
      textColour = "dark-purple";
      break;
  }

  // Add the below class if you'd like the description to be hidden when the tag is created.
  // 'g-onHover-show-grandchild-grandchild'
  element.classList.add("i-font-tiny", textColour);
  element.innerText = description;
  return element;
}

function renderTripDays(startDate, endDate) {
  let currentDate = startDate;
  let data = {};
  let tripDays = [];
  let diff = endDate.diff(startDate, "days"); // returns correct number
  tripBuilder.SetTotalDays(diff);
  tripBuilder.SetStartDate(startDate.clone());
  tripBuilder.SetEndDate(endDate.clone());

  let currentDay = 1;
  while (currentDate.isSameOrBefore(endDate)) {
    tripDays.push({
      day: currentDay,
      date: currentDate.clone(),
      formattedDate: currentDate.format("Do MMMM YYYY"),
      dayname: currentDate.format("dddd")
    });
    currentDate.add(1, "days");
    currentDay++;
  }

  $("#trip-builder-welcome").hide();
  let source = document.getElementById("entry-template").innerHTML;
  let template = Handlebars.compile(source);
  let html = template({tripDays: tripDays});
  $("#trip-days").html(html);
  $("#trip-builder").show();
}

/**
 *
 */
function renderBudgetTotals() {
  let totalBudget = tripBuilder.GetTotalBudget();
  let budgetUsed = tripBuilder.GetAllocatedBudget();
  $("#totalBudget").text(totalBudget);
  $("#currentBudget").text(budgetUsed);
}

/**
 * Renders the thermometer graphic.
 */
function renderThermometer() {
  let budgetPercentage = tripBuilder.GetBudgetBalancePercentage();
  budgetPercentage = budgetPercentage > 100 ? 100 : budgetPercentage;
  let meterSize = parseFloat((budgetPercentage / 100) * 290);
  let meterColour = "#398439";

  if (budgetPercentage >= 50 && budgetPercentage < 65) {
    meterColour = "#FFEB3B";
  } else if (budgetPercentage >= 65 && budgetPercentage < 75) {
    meterColour = "#FFBF00";
  } else if (budgetPercentage >= 75) {
    meterColour = "#f34e54";
  }

  $("#meter-amount").css("background-color", meterColour);
  $("#meter-circle").css("background-color", meterColour);
  $("#meter-filler").css("background-color", meterColour);
  $("#meter-amount").height(meterSize);
}

/**
 * Placeholder function that will be later used to render all services on the itine\irary display.
 * @param Array Array of services that make up your itinerary
 */
function renderItinerary(itinerary) {
  for (service of itinerary) {
    let startDate = moment(service.startDate);
    let endDate = moment(service.endDate);
    let tripStartDate = tripBuilder.GetStartDate();
    let currentDay = startDate.diff(tripStartDate.startOf("day"), "days") + 1;
    let serviceId = tripBuilder.AddService(
      currentDay,
      service.serviceType,
      service.status,
      startDate,
      endDate,
      service.data
    );
    renderServiceTags(serviceId, currentDay, service.serviceType, startDate, endDate);
  }
}

/**
 * Remove all div elements which have the service-id attribute with the ID that was specified.
 * @param int serviceId
 */
function removeServiceTags(serviceId) {
  $('.modal-edit-event-trigger[data-service-id="' + serviceId + '"]').remove();
}

function renderDuplicateBooking(existingBooking, diffBetweenStartDates) {
  let newItinerary = [];
  for (var itinerary of existingBooking.itinerary) {
    let newObject = {...itinerary};
    let newStartDate = moment(itinerary.pick_up_date, "YYYY-MM-DD HH:mm:ss").clone();
    let metadata = createServiceMetaData(newObject);
    newStartDate.add(diffBetweenStartDates, "d");
    let newEndDate = moment(itinerary.drop_off_date, "YYYY-MM-DD HH:mm:ss").clone();
    newEndDate.add(diffBetweenStartDates, "d");
    metadata.pick_up_date = newStartDate.clone();
    metadata.drop_off_date = newEndDate.clone();
    newItinerary.push(metadata);
  }

  return newItinerary;
}

function renderBookingForEditing(existingBooking) {
  let newItinerary = [];
  for (var itinerary of existingBooking.itinerary) {
    let newObject = {...itinerary};
    let newStartDate = moment(itinerary.pick_up_date, "YYYY-MM-DD HH:mm:ss").clone();
    let metadata = createServiceMetaData(newObject);
    let newEndDate = moment(itinerary.drop_off_date, "YYYY-MM-DD HH:mm:ss").clone();
    metadata.itinerary_id = itinerary.id;

    metadata.pick_up_date = newStartDate.clone();
    metadata.startDate = newStartDate.clone();
    metadata.data.pick_up_date = newStartDate.clone();
    metadata.drop_off_date = newEndDate.clone();
    metadata.data.drop_off_date = newEndDate.clone();
    metadata.endDate = newEndDate.clone();
    newItinerary.push(metadata);
  }

  let tripInfo = tripBuilder.TripInfo();
  tripInfo.partyCount = {
    adults: 0,
    children: 0,
    infants: 0
  };
  tripInfo.partyRooms = {
    doubles: 0,
    twins: 0,
    singles: 0,
    triples: 0
  };

  tripBuilder.AddRoomConfig(existingBooking.booking.party_name);
  tripBuilder.SetBookingNotes(existingBooking.booking.notes);

  let currentRoomConfig = tripBuilder.GetRoomConfig(1);

  for (const room of existingBooking.rooms) {
    const newRoomId = currentRoomConfig.addRoom(
      room.room_name,
      room.adults,
      room.children,
      room.infants,
      room.room_type,
      room.id
    );
    let newRoom = currentRoomConfig.getRoom(newRoomId);
    for (const pax of room.pax) {
      newRoom.addPax(pax.name, "", pax.type, pax.age);
    }
  }

  for (const room of currentRoomConfig.rooms) {
    tripInfo.partyCount.adults += parseInt(room.adults);
    tripInfo.partyCount.children += parseInt(room.children);
    tripInfo.partyCount.infants += parseInt(room.infants);
    switch (room.type) {
      case "single":
        tripInfo.partyRooms.singles++;
        break;
      case "double":
        tripInfo.partyRooms.doubles++;
        break;
      case "twin":
        tripInfo.partyRooms.twins++;
        break;
      case "triple":
        tripInfo.partyRooms.triples++;
        break;
      default:
        tripInfo.partyRooms.doubles++;
        break;
    }
  }
  tripInfo.partyName = existingBooking.booking.party_name;
  tripInfo.partyRooms.singles = tripInfo.partyRooms.singles.toString();
  tripInfo.partyRooms.doubles = tripInfo.partyRooms.doubles.toString();
  tripInfo.partyRooms.twins = tripInfo.partyRooms.twins.toString();
  tripInfo.partyRooms.triples = tripInfo.partyRooms.triples.toString();
  tripBuilder.AddTripInfo(tripInfo);
  tripBuilder.SetAgent(existingBooking.booking.agent);
  tripBuilder.SetBookingStatus(existingBooking.booking.booking_status);
  renderTripInfo();

  return newItinerary;
}

function createServiceMetaData(service) {
  let metadata = {
    data: {}
  };

  metadata.data.supplier = {...service.supplier};
  // {
  //   org_name: service.supplier.org_name,
  //   id: service.supplier.id,
  //   place: service.supplier.place
  // };
  metadata.data.remarks = service.remarks;
  metadata.data.costOverrides = _.map(service.costOverrides, _.clone);
  metadata.data.costing = _.map(service.costing, _.clone);
  metadata.data.serviceDescription = service.service_description;
  metadata.data.productId = parseInt(service.product_id);
  metadata.data.destinationId = parseInt(service.destination_id);
  metadata.data.price_code = service.price_code;
  metadata.data.id = service.id;
  metadata.data.rates = [service.rates];
  metadata.day = service.day;
  metadata.status = service.status;
  metadata.data.optionData = service.optionData;
  metadata.serviceType = service.service_type;

  metadata.pickupLocation = service.pick_up_location;
  metadata.dropoffLocation = service.drop_off_location;
  return metadata;
}

function renderTripInfo() {
  let paxCount = tripBuilder.GetPartyCount();
  const paxArray = tripBuilder.Pax();
  const tripInfo = tripBuilder.TripInfo();
  let roomConfig = [];

  for (var room in tripInfo.partyRooms) {
    if (tripInfo.partyRooms.hasOwnProperty(room)) {
      if (tripInfo.partyRooms[room].length > 0) {
        if (tripInfo.partyRooms[room] !== "0") {
          roomConfig.push(`${tripInfo.partyRooms[room]} x ${room}`);
        }
      }
    }
  }

  const paxNames = paxArray.map(function(pax) {
    return `${pax.first_name} ${pax.last_name}`;
  });

  $("#trip-info-pax-info").text(paxCount + " pax " + paxNames.join(", "));
  $("#trip-info-agent").text("Agent: " + tripBuilder.GetAgent());
  $("#trip-info-room-config").text(roomConfig.join(", "));
}

function setUpCostArray(activeTab, r) {
  let costArray = [];
  let roomConfigs = tripBuilder.GetAllRoomConfigs();

  if (activeTab == "accommodation") {
    for (let roomConfig of roomConfigs) {
      for (let room of roomConfig.getAllRooms()) {
        costArray.push(calculateRoomRate(room, rates, numberOfDays));
      }
    }
  } else {
    for (let roomConfig of roomConfigs) {
      let adultCount = 0,
        childCount = 0,
        infantCount = 0;

      for (let room of roomConfig.getAllRooms()) {
        adultCount += room.adults;
        childCount += room.children;
        infantCount += room.infants;
      }
      costArray.push(calculateServiceRate(adultCount, childCount, infantCount, rates, 1, response.product.description));
    }
  }
}

function calculateRoomRate(room, rates, days) {
  let adultPax = parseInt(room.adults);
  let childrenPax = parseInt(room.children);
  let infantPax = parseInt(room.infants);
  let cost = {};
  if (!Array.isArray(rates[0])) {
    alert("No rates available for this product");
  }

  if (room.type == "double") {
    cost = calculateDoubleRoomRate(room, rates[0], "AD", days, adultPax, childrenPax, infantPax);
  } else if (room.type == "twin") {
    cost = calculateDoubleRoomRate(room, rates[0], "AD", days, adultPax, childrenPax, infantPax);
  } else if (room.type == "single") {
    cost = calculateSingleRoomRate(room, rates[0], "AD", days, adultPax, childrenPax, infantPax);
  }

  return cost;
}

function calculateServiceRate(paxArray, rates, days, description) {
  let costBreakDown = [];
  let totalServicePrice = 0;
  let rate = 0;
  let costString = "";

  /**
   * Tourplan specific variables to take into account.
   */
  let fcu = UI.currentService.optionData.FCU;
  let scu = UI.currentService.optionData.SCU;
  let maxPaxPerFcu = parseInt(UI.currentService.optionData.MPFCU);
  let minScu = parseInt(UI.currentService.optionData.MIN_SCU);
  let maxScu = parseInt(UI.currentService.optionData.MAX_SCU);

  let totalFcu = 1;
  let adults = paxArray.filter(a => a.pax.type == "adult").length;
  let children = paxArray.filter(a => a.pax.type == "children").length;
  let infants = paxArray.filter(a => a.pax.type == "infants").length;

  let totalPax = adults + children + infants;
  // if(include children in pax breaks)
  // if(include infants in pax breaks)

  if (totalPax >= maxPaxPerFcu) {
    totalFcu = Math.ceil(totalPax / maxPaxPerFcu);
  }

  if (!Array.isArray(rates[0])) {
    alert("No rates available for this product");
    return;
  }
  let adultCostRateType = rates[0].find(rate => {
    return rate.rate_type == "FC" && rate.age_category == "AD";
  });

  let adultSellRateType = rates[0].find(rate => {
    return rate.rate_type == "FS" && rate.age_category == "AD";
  });

  let childCostRateType = rates[0].find(rate => {
    return rate.rate_type == "FC" && rate.age_category == "CH";
  });

  let childSellRateType = rates[0].find(rate => {
    return rate.rate_type == "FS" && rate.age_category == "CH";
  });

  let infantCostRateType = rates[0].find(rate => {
    return rate.rate_type == "FC" && rate.age_category == "IN";
  });

  let infantSellRateType = rates[0].find(rate => {
    return rate.rate_type == "FS" && rate.age_category == "IN";
  });

  const selectedPaxBreak = getSelectedPaxBreak(totalPax);
  const paxBreak = `price_pxb` + selectedPaxBreak;

  let adultPrice = parseFloat(adultSellRateType[paxBreak]);
  let childrenPrice = parseFloat(childSellRateType[paxBreak]);
  let infantPrice = parseFloat(infantSellRateType[paxBreak]);

  let adultCostPrice = parseFloat(adultCostRateType[paxBreak]);
  let childrenCostPrice = parseFloat(childCostRateType[paxBreak]);
  let infantCostPrice = parseFloat(infantCostRateType[paxBreak]);

  /**
   * If max pax per FCU > 1, it means that we need to calculate group rates.
   * Otherwise we calculate the rates per pax.
   */

  if (maxPaxPerFcu == 1) {
    let paxConfig = tripBuilder.GetRoomConfig(1);
    for (const pax of paxArray) {
      let paxServiceTotal = 0;
      let paxServiceCostTotal = 0;
      let currentRoom = paxConfig.getRoom(pax.roomId);
      switch (pax.pax.type) {
        case "adult":
          paxServiceTotal = adultPrice;
          paxServiceCostTotal = adultCostPrice;
          break;
        case "child":
          paxServiceTotal = childrenPrice;
          paxServiceCostTotal = childrenCostPrice;
          break;
        case "infant":
          paxServiceTotal = infantPrice;
          paxServiceCostTotal = infantCostPrice;
          break;
        default:
          paxServiceTotal = adultPrice;
          paxServiceCostTotal = adultCostPrice;
          break;
      }

      costBreakDown.push({
        pax: pax.pax,
        roomId: pax.roomId,
        rooms: [currentRoom],
        unitCost: adultCostPrice,
        unitSell: adultPrice,
        desc: `${pax.pax.name} - ${description}`,
        sellRate: paxServiceTotal,
        costRate: paxServiceCostTotal,
        agentRate: paxServiceTotal,
        total: paxServiceTotal
      });
    }
  } else {
    let paxServiceTotal = 0;
    let paxServiceCostTotal = 0;
    paxServiceCostTotal = totalFcu * days * adultCostPrice; // FCU = total groups
    paxServiceTotal = totalFcu * days * adultPrice;
    let paxConfig = tripBuilder.GetRoomConfig(1);
    let allRooms = paxConfig.getAllRooms();
    costBreakDown.push({
      desc: `${totalFcu} x ${description} x ${days} days`,
      rooms: allRooms,
      unitCost: adultCostPrice,
      unitSell: adultPrice,
      sellRate: paxServiceTotal,
      costRate: paxServiceCostTotal,
      agentRate: paxServiceTotal,
      total: paxServiceTotal
    });
  }

  return costBreakDown;
}

function calculateDoubleRoomRate(room, rates, ageCategory = "AD", days, adultPax = 0, childrenPax = 0, infantPax = 0) {
  let costBreakDown = {};
  let totalRoomPrice = 0;
  let sellRate = 0;
  let costRate = 0;
  let costString = "";
  let totalPax = adultPax + childrenPax + infantPax;

  let adultCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });

  let adultSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  let childCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });

  let childSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  let infantCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });

  let infantSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  if (totalPax == 1) {
    if (adultPax == 1) {
      sellRate = parseFloat(adultSellRateType.ss);
      costRate = parseFloat(adultCostRateType.ss);
    } else if (childrenPax == 1) {
      sellRate = parseFloat(childSellRateType.ss);
      costRate = parseFloat(childCostRateType.ss);
      if (sellRate == 0) {
        sellRate = parseFloat(adultSellRateType.ss);
        costRate = parseFloat(adultCostRateType.ss);
      }
    }
    costString = `<strong>${room.name}</strong>: Single room at ${sellRate} x ${days} nights`;
  } else if (totalPax == 2) {
    sellRate = parseFloat(adultSellRateType.tw);
    costRate = parseFloat(adultCostRateType.tw);
    costString = `<strong>${room.name}</strong>: Double room at ${sellRate} x ${days} nights`;
  }

  totalRoomPrice = days * sellRate;
  costBreakDown.total = totalRoomPrice;
  costBreakDown.desc = costString;
  costBreakDown.sellRate = sellRate;
  costBreakDown.unitCost = costRate;
  costBreakDown.unitSell = sellRate;
  costBreakDown.costRate = costRate;
  costBreakDown.agentRate = sellRate;
  costBreakDown.rooms = [room];

  return costBreakDown;
}

function createZeroCostBreakDown(room, days, adultPax = 0, childrenPax = 0, infantPax = 0) {
  let costBreakDown = {};
  let totalPax = adultPax + childrenPax + infantPax;
  let costString = "";
  costBreakDown.total = 0;

  costBreakDown.sellRate = 0;
  costBreakDown.unitCost = 0;
  costBreakDown.unitSell = 0;
  costBreakDown.costRate = 0;
  costBreakDown.agentRate = 0;
  costBreakDown.rooms = [room];

  if (room.type == "double") {
    costString = `<strong>${room.name}</strong>: Double room at ${costBreakDown.sellRate} x ${days} nights`;
  } else if (room.type == "twin") {
    costString = `<strong>${room.name}</strong>: Double room at ${costBreakDown.sellRate} x ${days} nights`;
  } else if (room.type == "single") {
    costString = `<strong>${room.name}</strong>: Single room at ${costBreakDown.sellRate} x ${days} nights`;
  }
  costBreakDown.desc = costString;

  return costBreakDown;
}

function calculateSingleRoomRate(room, rates, ageCategory = "AD", days, adultPax = 0, childrenPax = 0, infantPax = 0) {
  let costBreakDown = {};
  let totalRoomPrice = 0;
  let sellRate = 0;
  let costRate = 0;
  let costString = "";

  let adultCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });
  let adultSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  let childCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });
  let childSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  let infantCostRateType = rates.find(rate => {
    return rate.rate_type == "FC" && rate.age_category == ageCategory;
  });
  let infantSellRateType = rates.find(rate => {
    return rate.rate_type == "FS" && rate.age_category == ageCategory;
  });

  let totalPax = adultPax + childrenPax + infantPax;

  if (adultPax == 1) {
    sellRate = parseFloat(adultSellRateType.ss);
    costRate = parseFloat(adultCostRateType.ss);
  } else if (childrenPax == 1) {
    sellRate = parseFloat(childSellRateType.ss);
    if (sellRate == 0) {
      sellRate = parseFloat(adultSellRateType.ss);
      costRate = parseFloat(adultCostRateType.ss);
    }
  }
  costString = `<strong>${room.name}</strong>: Single room at ${sellRate} x ${days} nights`;

  totalRoomPrice = days * sellRate;
  costBreakDown.unitCost = costRate;
  costBreakDown.unitSell = sellRate;
  costBreakDown.total = totalRoomPrice;
  costBreakDown.desc = costString;
  costBreakDown.sellRate = sellRate;
  costBreakDown.costRate = costRate;
  costBreakDown.agentRate = sellRate;
  costBreakDown.rooms = [room];

  return costBreakDown;
}

function renderRoomConfigurations() {
  let roomConfigs = tripBuilder.GetAllRoomConfigs();
  let roomsToRender = [];
  let source = document.getElementById("room-overview-template").innerHTML;
  let template = Handlebars.compile(source);

  if (roomConfigs.length > 0) {
    roomsToRender = roomsToRender.concat(roomConfigs[0].rooms);
  }
  if (UI.paxConfig.newRooms.length > 0) {
    roomsToRender = roomsToRender.concat(UI.paxConfig.newRooms);
  }
  if (roomsToRender.length > 0) {
    $("#room-config-wrapper").empty();
  }
  document.getElementById("room-config-wrapper").innerHTML = template({rooms: roomsToRender});
}

function renderRoomDetails(roomId, isNewRoom = false) {
  $("#room-detail-wrapper").empty();
  let source = document.getElementById("room-detail-template").innerHTML;
  let template = Handlebars.compile(source);

  if (typeof roomId !== "undefined") {
    if (isNewRoom) {
      let currentRoom = {};
      for (let index = 0; index < UI.paxConfig.newRooms.length; index++) {
        if (UI.paxConfig.newRooms[index].id == roomId) {
          currentRoom = UI.paxConfig.newRooms[index];
          break;
        }
      }
      currentRoom.newRoom = true;
      currentRoom.isUpdate = true;

      // Update the mobx state
      UI.currentRoom.isNewRoom = true;
      UI.currentRoom.isUpdate = true;
      UI.currentRoom.id = roomId;

      UI.paxConfig.newRoom.adults = currentRoom.adults;
      UI.paxConfig.newRoom.children = currentRoom.children;
      UI.paxConfig.newRoom.infants = currentRoom.infants;

      document.getElementById("room-detail-wrapper").innerHTML = template(currentRoom);
    } else {
      let roomConfigs = tripBuilder.GetAllRoomConfigs();
      if (roomConfigs.length > 0) {
        let roomConfig = tripBuilder.GetRoomConfig(1);
        let currentRoom = roomConfig.getRoom(roomId);
        currentRoom.isUpdate = true;

        // Update the mobx state
        UI.currentRoom.isUpdate = true;
        UI.currentRoom.id = roomId;

        UI.paxConfig.newRoom.adults = currentRoom.adults;
        UI.paxConfig.newRoom.children = currentRoom.children;
        UI.paxConfig.newRoom.infants = currentRoom.infants;

        document.getElementById("room-detail-wrapper").innerHTML = template(currentRoom);
      }
    }
  } else {
    let roomConfigs = tripBuilder.GetAllRoomConfigs();
    let roomNumber = 0;
    if (roomConfigs.length == 0) {
      roomNumber = 1;
    } else {
      let roomConfig = tripBuilder.GetRoomConfig(1);
      roomNumber = roomConfig.getAllRooms().length + 1;
    }
    roomNumber += UI.paxConfig.newRooms.length;

    let blankRoomdata = {
      name: `Room ${roomNumber}`,
      type: "",
      adults: 0,
      children: 0,
      infants: 0,
      adultPax: [],
      childrenPax: [],
      infantPax: []
    };

    UI.paxConfig.newRoom.adults = 0;
    UI.paxConfig.newRoom.children = 0;
    UI.paxConfig.newRoom.infants = 0;
    document.getElementById("room-detail-wrapper").innerHTML = template(blankRoomdata);
    $("#room-detail").tab("show");
  }
}

/**
 * Render the values on the costing sheet modal.
 */
function renderCostingSheet() {
  let itinerary = tripBuilder.Itinerary();
  itinerary = _.sortBy(itinerary, ["day", "startDate"]);
  let rows = [];
  let calcRows = [];
  let currentDateFormat = "DD MMM YYYY"; // MySQL date format
  let totalCost = 0;
  let totalSell = 0;
  let totalAgent = 0;
  let totalMarkup = 0;
  let totalMarkupPercentage = 0;

  if (tripBuilder.GetRoomConfigCount() > 0) {
    const roomConfig = tripBuilder.GetRoomConfig(1);
    const rooms = roomConfig.rooms;
    console.log(roomConfig);
    let roomRows = [];
    for (let i = 0; i < rooms.length; i++) {
      const currentRoom = rooms[i];
      roomRows.push({
        name: currentRoom.name,
        type: currentRoom.type,
        adults: currentRoom.adults,
        children: currentRoom.children,
        infants: currentRoom.infants
      });
    }

    let source = document.getElementById("costing-sheet-pax-template").innerHTML;
    let template = Handlebars.compile(source);
    let html = template({rows: roomRows});
    $("#costing-sheet-pax-wrapper").html(html);
  }

  for (let i = 0; i < itinerary.length; i++) {
    const currentItinerary = itinerary[i];

    /**
     * Skip over any own arrangements.
     */
    if (currentItinerary.serviceType == "own-arrangement") {
      continue;
    }

    let startDate = moment(currentItinerary.startDate);
    let endDate = moment(currentItinerary.endDate);
    let totalDays = endDate.diff(startDate, "days");
    if (currentItinerary.serviceType != "accommodation" && totalDays == 0) {
      totalDays = 1;
    }
    // Second charge unit is equal to the number of costing elements we have.
    // let totalScu = currentItinerary.data.costing[0].rooms.length;
    let totalScu = totalDays;
    let totalFcu = 0;

    if (currentItinerary.serviceType == "accommodation") {
      totalFcu = currentItinerary.data.costing.length;
    } else {
      let maxPaxPerFcu = parseInt(currentItinerary.data.optionData.MPFCU);
      let totalPax = _.sumBy(currentItinerary.data.costing, "totalPax");
      totalFcu = Math.ceil(totalPax / maxPaxPerFcu);
    }

    /**
     * Check if sumBy works for acco as well..
     */
    totalCost = _.sumBy(currentItinerary.data.costing, "costRate");
    totalSell = _.sumBy(currentItinerary.data.costing, "sellRate");
    let sellRate = currentItinerary.data.costing[0].unitSell;
    sellRate = isNaN(sellRate) ? 0 : sellRate;
    let costRate = currentItinerary.data.costing[0].unitCost;
    costRate = isNaN(costRate) ? 0 : costRate;
    let agentRate = currentItinerary.data.costing[0].agentRate;
    agentRate = isNaN(agentRate) ? 0 : agentRate;

    let sellAmount = totalFcu * totalScu * sellRate;
    sellAmount = isNaN(sellAmount) ? 0 : sellAmount;
    let costAmount = totalFcu * totalScu * costRate;
    costAmount = isNaN(costAmount) ? 0 : costAmount;
    let agentAmount = totalFcu * totalScu * sellRate;
    agentAmount = isNaN(agentAmount) ? 0 : agentAmount;
    let markupPercentage = costRate == 0 ? 0 : ((sellRate - costRate) / costRate) * 100;
    markupPercentage = isNaN(markupPercentage) ? 0 : markupPercentage;
    let markupAmount = sellAmount - costAmount;

    // if(_.has(currentItinerary, "data.costOverride"))
    // {
    //   const overrides = currentItinerary.data.costOverride;

    //   if(costRate !== overrides.newUnitCost)
    //   {
    //     costRate = overrides.newUnitCost;
    //   }
    // }
    rows.push({
      id: currentItinerary.serviceId,
      day: currentItinerary.day,
      totalDays: totalDays,
      date: moment(currentItinerary.startDate).format(currentDateFormat),
      type: currentItinerary.serviceType,
      supplier: currentItinerary.data.supplier.org_name,
      description: currentItinerary.data.serviceDescription,
      sellRate: sellRate.toFixed(2),
      costRate: costRate.toFixed(2),
      agentRate: agentRate.toFixed(2),
      sellAmount: sellAmount.toFixed(2),
      costAmount: costAmount.toFixed(2),
      agentAmount: sellAmount.toFixed(2),

      markupAmount: markupAmount.toFixed(2),
      markupPercentage: markupPercentage.toFixed(2)
    });

    calcRows.push({
      id: currentItinerary.serviceId,
      unitCost: costRate,
      unitSell: sellRate,
      sellAmount: sellAmount,
      costAmount: costAmount,
      agentAmount: sellAmount,
      markupAmount: markupAmount,
      markupPercentage: markupPercentage
    });
  }

  if (calcRows.length > 0) {
    BookingState.clearCostingTable();
    BookingState.costingTotals = calcRows;
  }

  if (rows.length > 0) {
    totalCost = rows
      .map(e => parseFloat(e.costAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    totalSell = rows
      .map(e => parseFloat(e.sellAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    totalAgent = rows
      .map(e => parseFloat(e.agentAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });

    totalMarkup = rows
      .map(e => parseFloat(e.markupAmount))
      .reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
      });
    totalMarkupPercentage = ((totalSell - totalCost) / totalCost) * 100;
    totalMarkupPercentage = isNaN(totalMarkupPercentage) ? 0 : totalMarkupPercentage;
  }

  let source = document.getElementById("costing-sheet-template").innerHTML;
  let template = Handlebars.compile(source);
  let html = template({
    rows: rows,
    totalCost: totalCost.toFixed(2),
    totalSell: totalSell.toFixed(2),
    totalAgent: totalAgent.toFixed(2),
    totalMarkup: totalMarkup.toFixed(2),
    totalMarkupPercentage: totalMarkupPercentage.toFixed(2)
  });

  let totalSource = document.getElementById("costing-sheet-totals-template").innerHTML;
  let totalsTemplate = Handlebars.compile(totalSource);
  let totalsHtml = totalsTemplate({
    totalCost: totalCost.toFixed(2),
    totalSell: totalSell.toFixed(2),
    totalAgent: totalAgent.toFixed(2),
    totalMarkup: totalMarkup.toFixed(2),
    totalMarkupPercentage: totalMarkupPercentage.toFixed(2)
  });
  $("#costing-sheet-wrapper").html(html);
  $("#costing-sheet-totals").html(totalsHtml);
  $("#costing-sheet-wrapper tr").each(function() {
    let service = $(this).data("service-id");
    if (service !== undefined) {
      let currentServiceId = BookingState.costingTotals[service].id;
      updateCostingSheetRowFields(currentServiceId, this);
    }
  });
  // console.log(html);
}

function renderCost_workinprogress(isEdit = false) {
  let rooms = UI.currentCostRooms;
  let pax = UI.currentCostPax;
  let currentDateRange = null;
  let selectorPrefix = isEdit ? "#edit-" : "#";
  if (isEdit) {
    currentDateRange = $(selectorPrefix + UI.activeTab + "-pick-up-drop-off").data("daterangepicker");
  } else {
    currentDateRange = $(selectorPrefix + UI.activeTab + "-pick-up-drop-off").data("daterangepicker");
  }

  let startDate = null;
  let endDate = null;
  let numberOfDays = 0;
  /**
   * If we are adding a car rental service look for pick up and drop off dates.
   */
  if (UI.activeTab == "car-rental" || UI.activeTab == "flight") {
    let pickupDate = $(selectorPrefix + UI.activeTab + "-pick-up-time").data("daterangepicker");
    let dropOffDate = $(selectorPrefix + UI.activeTab + "-drop-off-time").data("daterangepicker");
    startDate = moment(pickupDate.startDate);
    endDate = moment(dropOffDate.endDate);
    numberOfDays = Math.ceil(endDate.diff(startDate, "days", true));
  } else {
    startDate = moment(currentDateRange.startDate);
    endDate = moment(currentDateRange.endDate);
    numberOfDays = endDate.diff(startDate, "days");
  }
  // Workaround to the issue with moment.js which does not show the correct difference
  // between the dates in days.
  if (UI.activeTab != "accommodation" && numberOfDays == 0) {
    numberOfDays = 1;
  }
  let costArray = [];
  let roomConfig = {};
  roomConfig = tripBuilder.GetRoomConfig(1);
  if (UI.activeTab == "accommodation") {
    let roomArray = [];
    if (rooms.length == 0) {
      roomArray = roomConfig.getAllRooms();
    } else {
      if (Array.isArray(rooms)) {
        for (let index = 0; index < rooms.length; index++) {
          roomArray.push(roomConfig.getRoom(rooms[index]));
        }
      }
    }
    /**
     * Todo: Important to note right now
     */
    UI.currentCostRooms = roomArray.map(a => a.id);
    for (let room of roomArray) {
      if (UI.currentService.rates == null) {
        costArray.push(createZeroCostBreakDown(room, numberOfDays));
      } else {
        costArray.push(calculateRoomRate(room, UI.currentService.rates, numberOfDays));
      }
    }
  } else {
    let paxArray = [];
    if (pax.length == 0) {
      for (const room of roomConfig.getAllRooms()) {
        for (const pax of room.getAllPax()) {
          paxArray.push({roomId: room.id, pax: pax});
        }
      }
    } else {
      if (Array.isArray(pax)) {
        for (let index = 0; index < pax.length; index++) {
          let room = roomConfig.getRoom(pax[index].roomId);
          paxArray.push({roomId: room.id, pax: room.getPax(pax[index].paxId)});
        }
      }
    }
    /**
     * Important to note right now
     */
    UI.currentCostPax = paxArray.map(a => {
      return {roomId: a.roomId, paxId: a.pax.id};
    });
    costArray = costArray.concat(
      calculateServiceRate(paxArray, UI.currentService.rates, numberOfDays, UI.currentService.productDescription)
    );
  }
  // }

  let supplierName = UI.currentService.supplierName;
  let supplierId = UI.currentService.supplierId;
  let productId = UI.currentService.productId;
  let productDescription = UI.currentService.productDescription;
  let concatAddress = UI.currentService.address;
  let ratesTable = UI.currentService.rates;

  renderCostBreakDown(
    UI.activeTab,
    supplierName,
    supplierId,
    productId,
    concatAddress,
    costArray,
    ratesTable,
    productDescription,
    isEdit
  );
}

function getSelectedPaxBreak(paxCount) {
  let paxBreakConfigurations = [];
  let indexName = "";
  for (let i = 1; i <= 24; i++) {
    indexName = "PXB" + i;
    if (UI.currentService.optionData[indexName] > 0) {
      paxBreakConfigurations.push({key: i, value: parseInt(UI.currentService.optionData[indexName])});
    }
  }
  let selectedConfigKey = 1;

  for (let i = 0; i < paxBreakConfigurations.length; i++) {
    if (paxCount <= paxBreakConfigurations[i]["value"]) {
      selectedConfigKey = paxBreakConfigurations[i]["key"];
      break;
    }
  }
  return selectedConfigKey;
}

function updateAllServiceMarkUpPercentages(percentage) {}

function cloneDate(date, hour = 0, minutes = 0) {
  return moment(date)
    .hours(hour)
    .minutes(minutes)
    .seconds(0)
    .clone();
}

/**
 * New functionality to handle edits
 */

function renderServiceLineStatus(element, status) {
  $(element)
    .attr("class", "")
    .addClass("service-line-" + status.toLowerCase());
  $(element).html(status);
}

function updateBooking(referenceNumber, data) {}

function updateCostingSheetRowFields(serviceId, tableRow) {
  let currentOverrides = tripBuilder.GetServiceCostOverrides(serviceId);
  if (currentOverrides) {
    $("td > input", tableRow).removeClass("amount-changed");
    $(this).addClass("amount-changed");
    for (const override of currentOverrides) {
      switch (override.fieldType) {
        case "cost-value":
          $("td input.service-cost-amount", tableRow).addClass("amount-changed");
          break;
        case "markup-value":
          $("td input.service-markup-amount", tableRow).addClass("amount-changed");
          break;
        case "markup-percentage":
          $("td input.service-markup-percentage", tableRow).addClass("amount-changed");
          break;
        case "sell-price":
          $("td input.service-sell-amount", tableRow).addClass("amount-changed");
          break;
        default:
          break;
      }
    }
  }
}

function loadSidebarNotesForm() {
  let source = document.getElementById("booking-notes-template").innerHTML;
  let template = Handlebars.compile(source);
  let notesHtml = template();
  $("#s-right-sidebar").prepend(notesHtml);
}

function recalculateBookingServices() {
  let data = prepareBookingData();
  $.ajax({
    type: "POST",
    url: "/tripbuilder/recalculate-rates",
    data: data,
    dataType: "json",
    success: function(response) {
      console.log(response);
    }
  });
}

function prepareBookingData() {
  let data = {};
  const dateFormat = "YYYY-MM-DD HH:mm:ss"; // MySQL date format
  let existingItinerary = tripBuilder.Itinerary();
  const agent = tripBuilder.GetAgent();
  const roomConfigCount = tripBuilder.GetRoomConfigCount();
  /**
   * Select only the fields that we need we sending off to the server.
   */
  existingItinerary = _.map(
    existingItinerary,
    _.partialRight(_.pick, [
      "data.id",
      "day",
      "endDate",
      "startDate",
      "status",
      "serviceType",
      "data.costing",
      "data.price_code",
      "data.drop_off_date",
      "data.pick_up_date",
      "data.drop_off_location",
      "data.pick_up_location",
      "data.productId",
      "data.destinationId",
      "data.serviceDescription",
      "data.supplier",
      "data.costOverrides",
      "data.remarks"
    ])
  );

  data.itinerary = JSON.parse(JSON.stringify(existingItinerary));

  data.tripInfo = tripBuilder.TripInfo();
  data.agent = tripBuilder.GetAgent();
  data.Pax = tripBuilder.Pax();
  data.budget = tripBuilder.GetTotalBudget();
  data.bookingStatus = tripBuilder.GetBookingStatus();
  // Append the travel and departure dates to the trip info object.
  data.tripInfo.travel_date = tripBuilder.GetStartDate().format(dateFormat);
  data.tripInfo.departure_date = tripBuilder.GetEndDate().format(dateFormat);

  data.booking_reference = getQueryVariable("ref");

  let roomConfig = tripBuilder.GetRoomConfig(1);
  let roomArray = roomConfig.getAllRooms();
  let rooms = [];

  for (const room of roomArray) {
    rooms.push({
      id: room.id,
      type: room.type,
      adultPax: room.adultPax,
      childrenPax: room.childrenPax,
      infantPax: room.infantPax,
      adults: room.adults,
      children: room.children,
      infants: room.infants,
      name: room.name,
      pax: room.pax
    });
  }

  data.roomConfig = rooms;

  return data;
}

function updateCurrentServiceProductRates(serviceStartDate, serviceEndDate, isEdit = false) {
  let agent = tripBuilder.GetAgent();
  let productId = UI.currentService.productId;
  let data = {
    id: productId,
    startDate: serviceStartDate.format(dateFormat),
    endDate: serviceEndDate.format(dateFormat),
    agentId: agent,
    paxCount: tripBuilder.GetPartyCount()
  };

  /**
   * If we are creating a package, add the markup property when searching.
   */
  if (builderMode == "packagebuilder") {
    data.markup = tripBuilder.GetMarkUp();
  }
  $.ajax({
    type: "post",
    url: "/tripbuilder/product",
    data: data,
    dataType: "json",
    success: function(response) {
      UI.clearCurrentService();
      UI.currentService.supplierName = response.supplier.org_name;
      UI.currentService.supplierId = response.supplier.id;
      UI.currentService.productId = response.product.id;
      UI.currentService.productDescription = response.product.description;
      UI.currentService.address = response.place.street + " " + response.place.suburb + " " + response.place.town;
      UI.currentService.rates = response.rates;
      UI.currentService.optionData = response.option;
      currentPlace = response.place;
      renderCost_workinprogress(isEdit);
    }
  });
}

function mapCostBreakDown(isUpdate = false) {
  let costingArray = [];
  let breakdowns = mobx.toJS(UI.currentService.costBreakDown);
  for (const breakdown of breakdowns) {
    let costing = {
      unitCost: 0,
      unitSell: 0,
      costRate: 0,
      agentRate: 0,
      sellRate: 0,
      total: 0,
      totalPax: 0,
      rooms: []
    };

    costing.unitCost = breakdown.unitCost;
    costing.unitSell = breakdown.unitSell;
    costing.costRate += breakdown.costRate;
    costing.agentRate += breakdown.agentRate;
    costing.sellRate += breakdown.sellRate;
    costing.total += breakdown.total;
    costing.desc = breakdown.desc;
    let currentRoomConfig = tripBuilder.GetRoomConfig(1);
    /**
     * update to allow for non-acco services
     */
    if (UI.activeTab == "accommodation" || UI.activeTab == "car-rental" || UI.activeTab == "entrance-fee") {
      for (const room of breakdown.rooms) {
        let currentRoomId = room.hasOwnProperty("id") ? room.id : room.roomId;
        let currentRoom = currentRoomConfig.getRoom(currentRoomId);
        costing.totalPax += currentRoom.adults + currentRoom.children + currentRoom.infants;
        for (const pax of currentRoom.pax) {
          costing.rooms.push({
            roomId: currentRoomId,
            paxId: pax.id
          });
        }
      }
    } else {
      costing.totalPax = 1;

      costing.rooms.push({
        roomId: breakdown.roomId,
        paxId: breakdown.pax.id
      });
      // for (const room of breakdown.rooms) {
      //   let currentRoomId = room.hasOwnProperty("id") ? room.id : room.roomId;
      //   let currentPaxId = room.hasOwnProperty("paxId") ? room.paxId : breakdown.pax.id;
      //   // let currentRoom = currentRoomConfig.getRoom(currentRoomId);
      //   costing.totalPax = 1;
      //   // for (const pax of breakdown.pax) {
      //   costing.rooms.push({
      //     roomId: currentRoomId,
      //     paxId: currentPaxId
      //   });
      //   // }
      // }
    }
    costingArray.push(costing);
  }

  return costingArray;
}

function handleServiceDateChange(ev, picker) {
  let serviceStartDate = null;
  let serviceEndDate = null;
  let currentDateID = $(ev.target).attr("id");
  let isEdit = false;

  if (currentDateID.includes("edit-")) {
    isEdit = true;
  }
  let selectorPrefix = isEdit ? "#edit-" : "#";
  if (UI.activeTab == "car-rental" || UI.activeTab == "flight") {
    let pickupDate = $(selectorPrefix + UI.activeTab + "-pick-up-time").data("daterangepicker");
    let dropOffDate = $(selectorPrefix + UI.activeTab + "-drop-off-time").data("daterangepicker");
    serviceStartDate = pickupDate.startDate;
    serviceEndDate = dropOffDate.startDate;
  } else {
    let currentDateRange = $(selectorPrefix + UI.activeTab + "-pick-up-drop-off").data("daterangepicker");
    serviceStartDate = currentDateRange.startDate;
    serviceEndDate = currentDateRange.endDate;
  }

  updateCurrentServiceProductRates(serviceStartDate, serviceEndDate, isEdit);
}
