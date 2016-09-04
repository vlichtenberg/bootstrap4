/**
 * Created by f.van.rijswijk on 2-9-2015.
 */
/*
 * Knockout handlers for bootstrap3 theme
 */

(function (ko, blueriq, moment) {
    'use strict';

    /**
     * This handler creates datepicker (http://eonasdan.github.io/bootstrap-datetimepicker/)
     */
    ko.bindingHandlers.bqDatePicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            viewModel.context.session.language.patterns.displaydate = viewModel.context.session.language.patterns.date;
            $(element).datetimepicker({
                format: viewModel.context.session.language.patterns.date.toUpperCase(),
                useCurrent: false
            }).on('dp.change', function (ev) {
                var value = $(ev.currentTarget).find('input').val();
                valueAccessor()(value);
            }).on('dp.show', function () {
                if (viewModel.readonly()) {
                    $(element).datetimepicker('hide');
                }
            });
        },
        update: function (element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value) {
                $(element).datetimepicker('setDate', value);
            }
        }
    };

    /**
     * This handler creates a datetimepicker (http://eonasdan.github.io/bootstrap-datetimepicker/)
     */
    ko.bindingHandlers.bqDateTimePicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var datetimeformat = viewModel.context.session.language.patterns.date.toUpperCase() + ' HH:mm:ss';
            viewModel.context.session.language.patterns.displaydate = datetimeformat.toLowerCase();
            $(element).datetimepicker({
                format: datetimeformat,
                useCurrent: false
            }).on('dp.change', function (ev) {
                var value = $(ev.currentTarget).find('input').val();
                valueAccessor()(value);
            }).on('dp.show', function () {
                if (viewModel.readonly()) {
                    $(element).datetimepicker('hide');
                }
            });
        },
        update: function (element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value) {
                $(element).datetimepicker('setDate', value);
            }
        }
    };

    /**
     * This handler creates a inline datetimepicker  (http://eonasdan.github.io/bootstrap-datetimepicker/)
     */
    ko.bindingHandlers.bqInlineDatePicker = {

        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {

            var val = ko.utils.unwrapObservable(valueAccessor());
            var options = {};

            if (!options.format) {
                options.format = viewModel.context.session.language.patterns.date;
            }

            options.format = options.format.toUpperCase();


            options.inline = true;

            if (val.value() !== null && val.value() !== 'undefined') {
                options.defaultDate = moment(val.value());
            }

            /*
             $(element).datetimepicker(options).on('changeDate', function () { //ev
             var date = $(this).datetimepicker('getDate');
             if (date instanceof Date && isFinite(date)) {
             options.value(date);
             } else {
             options.value(null);
             }
             });
             */

            $(element).datetimepicker(options).on('dp.change', function (ev) {
                //var date = $(ev.currentTarget).find('input').val();
                // console.log('onchange');
                // console.dir(ev.date);


                var date = ev.date;
                if ((date instanceof Date || date._isAMomentObject) && isFinite(date)) {
                    val.value(date);

                } else {
                    val.value(null);
                }
            });

        },
        update: function (element, valueAccessor) { //, allBindingsAccessor, viewModel, bindingContext
            var value = ko.utils.unwrapObservable(valueAccessor()).value();
            // console.log('update');
            // console.dir(value);
            if (value) {

                $(element).datetimepicker('date', value);
            }

            /*
             var options = ko.utils.unwrapObservable(valueAccessor());
             if (options) {
             $(element).datepicker('update', options.value());
             }
             */
        }
    };

    /** Easy Pie Chart Component
     * @constructor
     * @return {@link blueriq.models.dashboard.easyPieChartDefaults} default settings for easypie chart
     */
    blueriq.models.dashboard.easyPieChartDefaults = {
        animate: 2000,
        scaleColor: false,
        lineWidth: 12,
        lineCap: 'square',
        size: 100,
        trackColor: '#e5e5e5'
    };

    /** Easy Pie Colors
     * @constructor
     * @return {@link blueriq.models.dashboard.easyPieColors} color settings for easypie chart
     */
    blueriq.models.dashboard.easyPieColors = {
        color2: '#e7912a',
        color3: '#bacf0b',
        color4: '#4ec9ce',
        color5: '#ec7337',
        color6: '#f377ab',
        defaultColor: '#3da0ea'
    };

    /** Easy Pie Chart
     * @constructor
     * @return {@link blueriq.models.dashboard.easyPieChart} pie-chart to display numbers
     */
    ko.bindingHandlers.bqEasyPieChart = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var presentationStyle = allBindingsAccessor().style;

            var color = blueriq.models.dashboard.easyPieColors.defaultColor;
            if (presentationStyle && blueriq.models.dashboard.easyPieColors[presentationStyle]) {
                color = blueriq.models.dashboard.easyPieColors[presentationStyle];
            }

            var pieChartElement = $(element);
            pieChartElement.easyPieChart($.extend({}, blueriq.models.dashboard.easyPieChartDefaults, {barColor: color}));
            pieChartElement.data('easyPieChart').update(valueAccessor());
        }
    };




})(window.ko, window.blueriq, window.moment);