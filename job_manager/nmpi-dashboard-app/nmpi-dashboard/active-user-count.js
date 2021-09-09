var user_stats;

var now = new Date();
var today = now.toISOString().substring(0, 10);

d3.json("/api/v2/statistics/active-user-count/?start=2015-06-22&end=" + today + "&interval=7",
    function(error, json) {
        if (error) return console.warn(error);
        user_stats = json.objects;

        /* pull the user counts out of the user_stats dict so c3 can plot them */
        user_stats.forEach(function(entry) {
            for (var platform in entry.counts) {
                entry[platform] = entry.counts[platform];
            }
        });

        var chart = c3.generate({
            bindto: '#chart-active-user-count',
            data: {
                json: user_stats,
                keys: {
                    x: 'end_date',
                    value: ['SpiNNaker', 'BrainScaleS', 'BrainScaleS-2', 'BrainScaleS-ESS', 'Spikey'],
                },
                x: 'end_date',
                xFormat: '%Y-%m-%d',
                type: 'area',
                groups: [['SpiNNaker', 'BrainScaleS', 'BrainScaleS-2', 'BrainScaleS-ESS', 'Spikey']]
            },
            point: {
                show: false
            },
            axis: {
                x: {
                    type: 'timeseries',
                    tick: {
                        format: '%Y-%m-%d'
                    }
                },
                y: {
                    label: {
                        position: 'outer-middle',
                        text: 'Number of active users (total over all systems)'
                    },
                    min: 0,
                    padding: {top: 0, bottom: 0}
                },
            },
            padding: {
                top: 20,
                right: 80,
                bottom: 20,
                left: 80,
            },
        });
    }
);
