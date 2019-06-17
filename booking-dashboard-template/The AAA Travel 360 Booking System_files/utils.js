/**
 * Utils.js
 * Utility functions that are used throughout the tripbuilder application.
 */

$(function() {
  /**
   * Add a setMinDate function to the DateRangePicker.
   * This function allows you to the set minimum selectable date on a data picker
   */
  daterangepicker.prototype.setMinDate = function(minDate) {
    if (typeof minDate === "string") this.minDate = moment(minDate, this.locale.format);

    if (typeof minDate === "object") this.minDate = moment(minDate);

    if (!this.timePicker) this.minDate = this.minDate.startOf("day");

    if (this.timePicker && this.timePickerIncrement)
      this.minDate.minute(Math.round(this.minDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);

    if (this.minDate && this.startDate.isBefore(this.minDate)) {
      this.startDate = this.minDate.clone();
      if (this.timePicker && this.timePickerIncrement)
        this.startDate.minute(
          Math.round(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement
        );
    }

    if (!this.isShowing) this.updateElement();

    this.updateMonthsInView();
  };

  /**
   * Add a setMinDate function to the DateRangePicker.
   * This function allows you to the set minimum selectable date on a data picker
   */
  daterangepicker.prototype.setMaxDate = function(maxDate) {
    if (typeof maxDate === "string") this.maxDate = moment(maxDate, this.locale.format);

    if (typeof maxDate === "object") this.maxDate = moment(maxDate);

    if (!this.timePicker) this.maxDate = this.maxDate.startOf("day");

    if (this.timePicker && this.timePickerIncrement)
      this.maxDate.minute(Math.round(this.maxDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);

    if (this.maxDate && this.startDate.isAfter(this.maxDate)) {
      this.startDate = this.maxDate.clone();
      if (this.timePicker && this.timePickerIncrement)
        this.startDate.minute(
          Math.floor(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement
        );
    }

    if (!this.isShowing) this.updateElement();

    this.updateMonthsInView();
  };

  /**
   * Handlebars.js "for" loop helper.
   * Used throughout the templates to help with iterating through objects.
   */
  Handlebars.registerHelper("times", function(n, block) {
    var accum = "";
    for (var i = 0; i < n; ++i) accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper("select", function(value, options) {
    return options
      .fn(this)
      .split("\n")
      .map(function(v) {
        var t = 'value="' + value + '"';
        return !RegExp(t).test(v) ? v : v.replace(t, t + ' selected="selected"');
      })
      .join("\n");
  });

  Handlebars.registerPartial("adultPax", "{{adult-pax-template}}");
  Handlebars.registerPartial("childrenPax", "{{children-pax-template}}");
});

/**
 *
 * @param string variable Name of query parameter
 */
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
}
