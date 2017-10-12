var user_stats;



d3.json("/api/v2/statistics/cumulative-project-count/",
    function(error, data) {
        if (error) return console.warn(error);
        console.info(data);
        var dates = data.accepted.dates;
        var values = data.accepted.values;

        values.unshift('accepted');
        dates.unshift('x');


        var chart = c3.generate({
            bindto: '#chart-cumulative-project-count',
            data: {
                x: 'x',
                xFormat: '%Y-%m-%d',
                columns: [dates, values],
                type: 'area-step',
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
                        text: 'Number of accepted projects'
                    },
                    min: 0,
                    padding: {top: 0, bottom: 0}
                }
            },
            line: {
                step: {
                    type: 'step-after'
                }
            },
            legend: {
                show: false
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

