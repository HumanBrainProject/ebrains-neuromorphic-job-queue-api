
d3.json("/api/v2/statistics/job-duration/?scale=log&bins=50",
    function(error, data) {
        if (error) return console.warn(error);
        var job_durations = {
            spinnaker_finished: data.objects.filter(
                                    function (item) {
                                        return item.platform == 'SpiNNaker' && item.status == 'finished';
                                    })[0],
            brainscales_finished: data.objects.filter(
                                    function (item) {
                                        return item.platform == 'BrainScaleS' && item.status == 'finished';
                                    })[0],
            spikey_finished: data.objects.filter(
                                    function (item) {
                                        return item.platform == 'Spikey' && item.status == 'finished';
                                    })[0],
        }

        job_durations.spinnaker_finished.bins.unshift('x');
        job_durations.spinnaker_finished.values.unshift('SpiNNaker (finished)');
        job_durations.brainscales_finished.bins.unshift('x');
        job_durations.brainscales_finished.values.unshift('BrainScaleS (finished)');
        job_durations.spikey_finished.bins.unshift('x');
        job_durations.spikey_finished.values.unshift('Spikey (finished)');

        var axis = {
                x: {
                    label: {
                        position: 'outer-center',
                        text: 'Job duration (seconds)'
                    },
                    tick: {
                        values: ['0', '1', '2', '3', '4', '5'],
                        format: function (x) { return '10^' + x; }
                    }
                },
                y: {
                    label: {
                        position: 'outer-middle',
                        text: 'Number of jobs'
                    },
                    min: 0,
                    padding: {top: 0, bottom: 0}
                }
            }
        var padding = {
                top: 20,
                right: 20,
                bottom: 20,
                left: 60,
            }

        var chart1 = c3.generate({
            bindto: '#chart-job-duration-spinnaker',
            data: {
                x: 'x',
                columns: [
                    job_durations.spinnaker_finished.bins,
                    job_durations.spinnaker_finished.values
                ],
                type: 'area-step',
                colors: {
                    'SpiNNaker (finished)': '#1f77b4',
                },
            },
            line: {
                step: {
                    type: 'step-after'
                }
            },
            axis: axis,
            padding: padding,
        });

        var chart2 = c3.generate({
            bindto: '#chart-job-duration-brainscales',
            data: {
                x: 'x',
                columns: [
                    job_durations.brainscales_finished.bins,
                    job_durations.brainscales_finished.values
                ],
                type: 'area-step',
                colors: {
                    'BrainScaleS (finished)': '#ff7f0e',
                },
            },
            line: {
                step: {
                    type: 'step-after'
                }
            },
            axis: axis,
            padding: padding,
        });

        var chart3 = c3.generate({
            bindto: '#chart-job-duration-spikey',
            data: {
                x: 'x',
                columns: [
                    job_durations.spikey_finished.bins,
                    job_durations.spikey_finished.values
                ],
                type: 'area-step',
                colors: {
                    'Spikey (finished)': '#d62728',
                },
            },
            line: {
                step: {
                    type: 'step-after'
                }
            },
            axis: axis,
            padding: padding,
        });
});
