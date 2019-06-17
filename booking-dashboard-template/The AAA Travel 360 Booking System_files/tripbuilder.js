/**
 * TripBuilder.js
 *
 */
var tripBuilder = (function(tripbuilder) {
  let itinerary = [];
  let pax = [];
  let tripInfo = {};
  let serviceId = 0;
  let dayHeight = 240; // height of the "day" element
  let hourHeight = dayHeight / 24; // height of the day divided by 24 (number of hours in day)
  let minuteHeight = hourHeight / 60;
  let totalDays = 0;
  let startDate = {};
  let endDate = {};
  let dateFormat = "YYYY-MM-DD HH:mm:ss";
  let totalBudget = 0;
  let allocatedBudget = 0;
  let roomConfigs = [];
  let roomConfigId = 0;
  let agent = "";
  let bookingStatus = "";
  let bookingNotes = "";
  let markUp = 0;

  /**
   * Package specific variables.
   */
  let validDateRange = "";
  let priceCode = "";

  /**
   * Adds a new service object to the Itinerary Array object
   * @param int day
   * @param string serviceType
   * @param DateTime startDate
   * @param DateTime endDate
   * @param Object data
   */
  function AddServiceToItinerary(day, serviceType, status, startDate, endDate, data) {
    const newId = serviceId;
    itinerary.push({
      serviceId: newId,
      day: day,
      serviceType: serviceType,
      startDate: startDate.format(dateFormat),
      endDate: endDate.format(dateFormat),
      status: status,
      data: data
    });
    serviceId++;
    return newId;
  }

  /**
   * Updates an existing service object to the Itinerary Array object
   * @param int serviceId
   * @param int day
   * @param string serviceType
   * @param DateTime startDate
   * @param DateTime endDate
   * @param Object data
   */
  function UpdateServiceInItinerary(serviceId, day, serviceType, status, startDate, endDate, data) {
    let currentService = GetService(serviceId);
    let placeRate = data.supplier.place.sellRate;
    let serviceDays = endDate.diff(startDate, "days");
    let serviceTotal = placeRate * serviceDays;
    serviceDays = serviceDays == 0 ? 1 : serviceDays;

    currentService.day = day;
    currentService.serviceType = serviceType;
    currentService.startDate = startDate.format(dateFormat);
    currentService.status = status;
    currentService.endDate = endDate.format(dateFormat);
    currentService.data = data;
    AddToBudget(serviceDays, placeRate);
  }

  /**
   * Get an service object based on service ID.
   * @param int serviceId
   */
  function GetService(serviceId) {
    for (let index = 0; index < itinerary.length; index++) {
      if (itinerary[index].serviceId == serviceId) {
        return itinerary[index];
      }
    }
  }

  function GetServiceCount(serviceType) {
    let serviceCount = 0;
    for (let index = 0; index < itinerary.length; index++) {
      if (itinerary[index].serviceType == serviceType) {
        serviceCount++;
      }
    }
    return serviceCount;
  }

  /**
   *
   * @param {int} serviceId
   * @param {object} overridesObject
   */
  function AddServiceCostOverride(serviceId, overridesObject) {
    let currentService = GetService(serviceId);
    /**
     * First check if we have a costing object, if it exists then check if the override exists
     * Then either update or create the override object.
     * When doing an update, only update the newValue values, retaining original values.
     */
    if (_.has(currentService, ["data", "costOverrides"])) {
      /**
       * Before adding a new override, remove old markup values or percentages.
       */
      if (_.includes(["markup-value", "markup-percentage", "sell-price"], overridesObject.fieldType)) {
        for (let index = 0; index < currentService.data.costOverrides.length; index++) {
          if (
            _.includes(
              ["markup-value", "markup-percentage", "sell-price"],
              currentService.data.costOverrides[index].fieldType
            )
          ) {
            currentService.data.costOverrides.splice(index, 1);
          }
        }
      }

      let currentOverride = _.find(currentService.data.costOverrides, function(c) {
        return c.fieldType == overridesObject.fieldType;
      });
      if (currentOverride) {
        currentOverride.newValue = overridesObject.newValue;
      } else {
        currentService.data.costOverrides.push(overridesObject);
      }
    } else {
      currentService.data.costOverrides = [overridesObject];
    }
  }

  function GetServiceCostOverrides(serviceId) {
    let currentService = GetService(serviceId);
    return _.get(currentService, ["data", "costOverrides"]);
  }

  /**
   * Retrieve room config by ID.
   * @param int roomConfigId
   */
  function GetRoomConfig(roomConfigId) {
    for (let index = 0; index < roomConfigs.length; index++) {
      if (roomConfigs[index].id == roomConfigId) {
        return roomConfigs[index];
      }
    }
  }

  function SetRoomConfig(roomConfigId, roomConfig) {
    for (let index = 0; index < roomConfigs.length; index++) {
      if (roomConfigs[index].id == roomConfigId) {
        roomConfigs[index] = roomConfig;
      }
    }
  }

  function AddToBudget(numberOfDays, rate) {
    let serviceTotal = rate * numberOfDays;
    allocatedBudget += serviceTotal;
  }

  /**
   *
   */
  function RemoveFromBudget(numberOfDays, rate) {
    let serviceTotal = rate * numberOfDays;
    allocatedBudget -= serviceTotal;
  }

  function SetNotes(notes) {
    bookingNotes = notes;
  }

  function GetNotes() {
    return bookingNotes;
  }

  function SetMarkup(newMarkup) {
    markUp = newMarkup;
  }

  function GetMarkup() {
    return markUp;
  }

  /**
   * Publically exposed functions which are accessible from other objects.
   */
  ((tripbuilder.AddRoomConfig = function(configName) {
    roomConfigId++;
    let newRoomConfig = {
      id: roomConfigId,
      name: configName,
      rooms: [],
      roomId: 0,
      addRoom: function(name, adults = 0, children = 0, infants = 0, type, existingId = -1) {
        let newRoomId = existingId == -1 ? ++this.roomId : existingId;
        let newRoom = {
          id: newRoomId,
          name: name,
          type: type,
          adults: adults,
          children: children,
          infants: infants,
          pax: [],
          adultPax: [],
          childrenPax: [],
          infantPax: [],
          paxId: 0,
          addPax: function(firstName, surname, paxType, age, notes = "") {
            newRoom.paxId++;
            let newPax = {
              id: newRoom.paxId,
              name: `${firstName} ${surname}`,
              firstName: firstName,
              surname: surname,
              type: typeof paxType == "undefined" ? "adult" : paxType,
              age: age,
              notes: notes
            };
            this.pax.push(newPax);
            switch (newPax.type) {
              case "adult":
                this.adultPax.push(newPax);
                break;
              case "child":
                this.childrenPax.push(newPax);
                break;
              case "infant":
                this.infantPax.push(newPax);
                break;
              default:
                this.adultPax.push(newPax);
                break;
            }
            return newPax.id;
          },
          updatePax: function(paxId, firstName, surname, age) {
            let currentPax = this.getPax(paxId);
            currentPax.name = `${firsName} ${surname}`;
            currentPax.firstName = firstName;
            currentPax.surname = surname;
            currentPax.age = age;
          },
          getPax: function(paxId) {
            for (let index = 0; index < this.pax.length; index++) {
              if (this.pax[index].id == paxId) {
                return this.pax[index];
              }
            }
          },
          getAllPax: function() {
            return this.pax;
          }
        };
        this.rooms.push(newRoom);

        return newRoom.id;
      },
      getRoom: function(roomId) {
        for (let index = 0; index < this.rooms.length; index++) {
          if (this.rooms[index].id == roomId) {
            return this.rooms[index];
          }
        }
      },
      updateRoom: function(roomId, room) {
        for (let index = 0; index < this.rooms.length; index++) {
          if (this.rooms[index].id == roomId) {
            let updatedRoom = this.rooms[index];
            /**
             * Assign each property individually for now, look at deep cloning it in future.
             */
            updatedRoom.name = room.name;
            updatedRoom.type = room.type;
            updatedRoom.adults = room.adults;
            updatedRoom.children = room.children;
            updatedRoom.infants = room.infants;
            updatedRoom.adultPax = room.adultPax;
            updatedRoom.childrenPax = room.childrenPax;
            updatedRoom.infantPax = room.infantPax;
            updatedRoom.pax = room.pax;
          }
        }
      },
      removeRoom: function(roomId) {
        for (let index = 0; index < this.rooms.length; index++) {
          if (this.rooms[index].id == roomId) {
            this.rooms.splice(index, 1);
          }
        }
      },
      getAllRooms: function() {
        return this.rooms;
      },
      getPaxCountForRoom: function(roomId) {
        let room = this.getRoom(roomId);
        return room.pax.length;
      },
      getPaxTotalForRoom: function(roomId) {
        let room = this.getRoom(roomId);
        let paxTotal = room.adults + room.children + room.infants;
        return paxTotal;
      },
      getTotalPaxForAllRooms: function() {
        let allRooms = this.getAllRooms();
        let paxTotal = 0;
        let roomTotals = {
          adults: 0,
          children: 0,
          infants: 0,
          totalPax: 0
        };

        for (const room of allRooms) {
          roomTotals.adults += room.adults;
          roomTotals.children += room.children;
          roomTotals.infants += room.infant;
          roomTotals.totalPax += room.adults + room.children + room.infants;
        }
        return roomTotals;
      }
    };
    roomConfigs.push(newRoomConfig);
    return roomConfigId;
  }),
  ((tripbuilder.GetRoomConfigCount = function() {
    return roomConfigs.length;
  }),
  (tripbuilder.GetAllRoomConfigs = function() {
    return roomConfigs;
  }),
  (tripbuilder.GetRoomConfig = function(roomConfigId) {
    for (let index = 0; index < roomConfigs.length; index++) {
      if (roomConfigs[index].id == roomConfigId) {
        return roomConfigs[index];
      }
    }
  }),
  (tripbuilder.SetRoomConfig = function(roomConfigId, roomConfig) {
    for (let index = 0; index < roomConfigs.length; index++) {
      if (roomConfigs[index].id == roomConfigId) {
        roomConfigs[index] = roomConfig;
      }
    }
  }),
  /**
   *
   */
  ((tripbuilder.ClearRoomConfigs = function() {
    roomConfigs = [];
    roomConfigId = 0;
  }),
  (tripbuilder.UpdateRoomConfig = function(roomConfigId, name) {
    let roomConfig = GetRoomConfig(roomConfigId);
    roomConfig.name = name;
  }),
  /**
   * Add a new service to the itinerary.
   * @param int day
   * @param string serviceType
   * @param DateTime startDate
   * @param DateTime endDate
   * @param object data
   */
  (tripbuilder.AddService = function(day, serviceType, status, startDate, endDate, data) {
    let remainingBalance = this.GetBudgetBalance();
    let placeRate = parseFloat(data.supplier.place.sellRate);
    placeRate = isNaN(placeRate) ? 0 : placeRate;
    let serviceTotal = 0;
    let serviceDays = 1;

    if (serviceType == "excursion") {
      serviceTotal = placeRate * serviceDays;
      serviceDays = endDate.diff(startDate, "days");
    } else if (serviceType == "accommodation") {
      serviceDays = endDate.diff(startDate, "days");
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "meet-greet") {
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "transfer") {
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "meal") {
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "day-pass") {
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "car-rental") {
      serviceTotal = placeRate * serviceDays;
      serviceDays = endDate.diff(startDate, "days");
    } else if (serviceType == "flight") {
      serviceTotal = placeRate * serviceDays;
    } else if (serviceType == "own-arrangement") {
      serviceTotal = 0;
    } else {
      serviceTotal = placeRate * serviceDays;
    }

    if (serviceDays == 0) {
      serviceDays = 1;
    }

    if (remainingBalance > 0 && serviceTotal > remainingBalance) {
      if (
        confirm(
          "\r\nAdding this service will mean you are over your specified budget.\r\nAre you sure you'd like to add this service?"
        )
      ) {
      } else {
        return;
      }
    }

    AddToBudget(serviceDays, placeRate);

    // let startingPointHeight = minuteHeight * serviceTime; // 30 Minutes for now
    let serviceId = AddServiceToItinerary(day, serviceType, status, startDate, endDate, data);
    return serviceId;
  }))),
  (tripbuilder.UpdateService = function(
    serviceId,
    serviceType,
    day,
    status,
    startDate,
    endDate,
    oldServiceStartDate,
    oldServiceEndDate,
    data
  ) {
    // this.RemoveService(serviceId);
    let service = GetService(serviceId);
    let rate = service.data.supplier.place.sellRate;
    let numberOfDays = oldServiceEndDate.diff(oldServiceStartDate, "days");
    // Dont know if this will work instead
    // let numberOfDays = service.data.drop_off_date.diff(service.data.pick_up_date, "days");
    if (numberOfDays == 0) {
      numberOfDays = 1;
    }
    RemoveFromBudget(numberOfDays, rate);

    UpdateServiceInItinerary(serviceId, day, serviceType, status, startDate, endDate, data);
  }),
  /**
   *
   * @param object info
   */

  (tripbuilder.AddTripInfo = function(info) {
    tripInfo = info;
  }),
  /**
   *
   * @param string
   */
  (tripbuilder.GetServiceCount = function(serviceType) {
    return GetServiceCount(serviceType);
  }),
  /**
   * Add the paxID if it does not exist in the pax array yet.
   * @param int paxID
   */
  (tripbuilder.AddPax = function(paxID) {
    if (pax.indexOf(paxID) == -1) pax.push(paxID);
  }),
  /**
   * Add the paxID if it does not exist in the pax array yet.
   * @param int paxID
   */
  (tripbuilder.AddPaxArray = function(paxArray) {
    pax = paxArray;
  }),
  /**
   * Remove the paxID if it exists int the PaxID.
   * @param int paxID
   */
  (tripbuilder.RemovePax = function(paxId) {
    for (let index = 0; index < pax.length; index++) {
      if (pax[index].id == paxId) {
        pax.splice(index, 1);
        return;
      }
    }
  }),
  /**
   * Get the pax count.
   */
  (tripbuilder.GetPaxCount = function() {
    return pax.length;
  }),
  /**
   *
   */
  (tripbuilder.GetPartyCount = function() {
    let partyCount = 0;
    if (typeof tripInfo.partyCount == "object") {
      partyCount = tripInfo.partyCount.adults + tripInfo.partyCount.children + tripInfo.partyCount.infants;
    }
    return partyCount;
  }),
  /**
   *
   * @param int serviceId
   */
  (tripbuilder.GetService = function(serviceId) {
    for (let index = 0; index < itinerary.length; index++) {
      if (itinerary[index].serviceId == serviceId) {
        return itinerary[index];
      }
    }
  })),
    /**
     * Clear the existing itinerary array and reset the allocated budget.
     */
    (tripbuilder.ClearItinerary = function() {
      itinerary = [];
      serviceId = 1;
      allocatedBudget = 0;
    }),
    /**
     * Clear the existing pax array.
     */
    (tripbuilder.ClearPax = function() {
      pax = [];
    }),
    (tripbuilder.ClearTripInfo = function() {
      tripInfo = {};
    }),
    /**
     * Remove the service from the itinerary and update the budget of the trip.
     * @param int serviceId
     */
    (tripbuilder.RemoveService = function(serviceId) {
      for (let index = 0; index < itinerary.length; index++) {
        if (itinerary[index].serviceId == serviceId) {
          let service = GetService(serviceId);
          let rate = service.data.supplier.place.sellRate;
          let numberOfDays = service.data.drop_off_date.diff(service.data.pick_up_date, "days");
          if (numberOfDays == 0) {
            numberOfDays = 1;
          }
          RemoveFromBudget(numberOfDays, rate);
          // RemoveServiceTags(serviceId);
          itinerary.splice(index, 1);
        }
      }
    }),
    (tripbuilder.GetServicesForDay = function(day) {
      let daysServices = itinerary.find(item => {
        return item.day == day;
      });
      return daysServices;
    }),
    /**
     * Returns the itinerary object.
     */
    (tripbuilder.Itinerary = function() {
      return itinerary;
    }),
    /**
     * Returms pax object.
     */
    (tripbuilder.Pax = function() {
      return pax;
    }),
    (tripbuilder.TripInfo = function() {
      return tripInfo;
    }),
    (tripbuilder.GetStartDate = function() {
      return _.isEmpty(startDate) ? moment() : startDate;
    }),
    (tripbuilder.GetEndDate = function() {
      return _.isEmpty(endDate) ? moment() : endDate;
    }),
    (tripbuilder.SetStartDate = function(date) {
      startDate = date;
    }),
    (tripbuilder.SetEndDate = function(date) {
      endDate = date;
    }),
    (tripbuilder.SetTotalDays = function(days) {
      totalDays = days;
    }),
    (tripbuilder.SetTotalBudget = function(budget) {
      totalBudget = budget;
    }),
    (tripbuilder.GetTotalBudget = function() {
      return totalBudget;
    }),
    (tripbuilder.GetBudgetBalance = function() {
      return totalBudget - allocatedBudget;
    }),
    (tripbuilder.GetAllocatedBudget = function() {
      return allocatedBudget;
    }),
    (tripbuilder.GetBudgetBalancePercentage = function() {
      // return (allocatedBudget / totalBudget) * 100;
      return (allocatedBudget * 100) / totalBudget;
    }),
    (tripbuilder.SetAgent = function(newAgent) {
      agent = newAgent;
    }),
    (tripbuilder.GetAgent = function() {
      return agent;
    });

  (tripbuilder.SetBookingStatus = function(newStatus) {
    bookingStatus = newStatus;
  }),
    (tripbuilder.GetBookingStatus = function() {
      return bookingStatus;
    });
  tripbuilder.GetFullBooking = function() {
    const dateFormat = "YYYY-MM-DD HH:mm:ss";

    let tripData = {};
    tripData.tripInfo = tripBuilder.TripInfo();
    tripData.itinerary = tripBuilder.Itinerary();
    tripData.agent = tripBuilder.GetAgent();
    tripData.pax = tripBuilder.Pax();
    tripData.budget = tripBuilder.GetTotalBudget();
    tripData.bookingStatus = tripBuilder.GetBookingStatus();
    tripData.tripInfo.travel_date = tripBuilder.GetStartDate().format(dateFormat);
    tripData.tripInfo.departure_date = tripBuilder.GetEndDate().format(dateFormat);

    if (tripBuilder.GetRoomConfigCount() > 0) {
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
      tripData.roomConfig = rooms;
    }

    return tripData;
  };

  tripbuilder.AddServiceCostOverride = function(
    serviceId,
    costOverrideReason,
    costOverrideText = "",
    originalCost,
    costOverride,
    originalSell,
    sellOverride,
    originalCostTotal,
    originalSellTotal
  ) {
    AddServiceCostOverride(
      serviceId,
      costOverrideReason,
      (costOverrideText = ""),
      originalCost,
      costOverride,
      originalSell,
      sellOverride,
      originalCostTotal,
      originalSellTotal
    );
  };

  tripbuilder.GetServiceCostOverrides = function(serviceId) {
    return GetServiceCostOverrides(serviceId);
  };

  tripbuilder.SetValidDateRange = function(year) {
    validDateRange = year;
  };
  tripbuilder.GetValidDateRange = function() {
    return validDateRange;
  };

  tripbuilder.SetPriceCode = function(code) {
    priceCode = code;
  };
  tripbuilder.GetPriceCode = function() {
    return priceCode;
  };

  tripbuilder.SetBookingNotes = function(notes) {
    SetNotes(notes);
  };

  tripbuilder.GetBookingNotes = function() {
    return GetNotes();
  };

  tripbuilder.SetMarkup = function(newMarkUp) {
    return SetMarkup(newMarkUp);
  };

  tripbuilder.GetMarkUp = function() {
    return GetMarkup();
  };

  tripbuilder.GetRoomsForService = function(serviceId) {
    let currentService = this.GetService(serviceId);
    let currentCosting = currentService.data.costing;
    let rooms = [];
    for (const costing of currentCosting) {
      for (const room of costing.rooms) {
        rooms.push(room.roomId);
      }
    }
    return _.uniq(rooms);
  };

  if (typeof exports === "object") {
    module.exports = tripbuilder;
  }
  return tripbuilder;
})(tripBuilder || {});
