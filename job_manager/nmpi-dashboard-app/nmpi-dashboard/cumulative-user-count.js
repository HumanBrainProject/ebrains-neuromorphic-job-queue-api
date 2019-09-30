var user_stats;



d3.json("/api/v2/statistics/cumulative-user-count/",
    function(error, data) {
        if (error) return console.warn(error);
        console.info(data);
        var dates = data.dates;
        var values = data.values;

        values.unshift('users');
        dates.unshift('x');


        var chart = c3.generate({
            bindto: '#chart-cumulative-user-count',
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
                        text: 'Number of platform users'
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

d3.json("/api/v2/statistics/cumulative-user-count/?platform=BrainScaleS",
    function(error, data) {
        if (error) return console.warn(error);
        console.info(data);
        var dates = data.dates;
        var values = data.values;

        values.unshift('users');
        dates.unshift('x');


        var chart = c3.generate({
            bindto: '#chart-cumulative-user-count-BrainScaleS',
            data: {
                x: 'x',
                xFormat: '%Y-%m-%d',
                columns: [dates, values],
                type: 'area-step'
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
                        text: 'Number of BrainScaleS users'
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

d3.json("/api/v2/statistics/cumulative-user-count/?platform=SpiNNaker",
    function(error, data) {
        if (error) return console.warn(error);
        console.info(data);
        var dates = data.dates;
        var values = data.values;

        values.unshift('users');
        dates.unshift('x');


        var chart = c3.generate({
            bindto: '#chart-cumulative-user-count-SpiNNaker',
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
                        text: 'Number of SpiNNaker users'
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

d3.json("/api/v2/statistics/cumulative-user-count/?platform=Spikey",
    function(error, data) {
        if (error) return console.warn(error);
        console.info(data);
        var dates = data.dates;
        var values = data.values;

        values.unshift('users');
        dates.unshift('x');


        var chart = c3.generate({
            bindto: '#chart-cumulative-user-count-Spikey',
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
                        text: 'Number of Spikey users'
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