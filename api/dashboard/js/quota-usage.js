var now = new Date();
var today = now.toISOString().substring(0, 10);

d3.json(
  "/statistics/resource-usage?start=2015-06-22&end=" + today + "&interval=7",
  function (error, user_stats) {
    if (error) return console.warn(error);

    /* pull the values out of the user_stats dict so c3 can plot them */
    user_stats.forEach(function (entry) {
      for (var platform in entry.value) {
        entry[platform] = entry.value[platform];
      }
    });

    var chart = c3.generate({
      bindto: "#chart-resource-usage",
      data: {
        json: user_stats,
        keys: {
          x: "end",
          value: [
            "SpiNNaker",
            "BrainScaleS",
            "BrainScaleS-2",
            "BrainScaleS-ESS",
            "Spikey",
          ],
        },
        x: "end",
        xFormat: "%Y-%m-%d",
        type: "area",
        groups: [
          [
            "SpiNNaker",
            "BrainScaleS",
            "BrainScaleS-2",
            "BrainScaleS-ESS",
            "Spikey",
          ],
        ],
      },
      point: {
        show: false,
      },
      axis: {
        x: {
          type: "timeseries",
          tick: {
            format: "%Y-%m-%d",
          },
        },
        y: {
          label: {
            position: "outer-middle",
            text: "Resource usage",
          },
          min: 0,
          padding: { top: 0, bottom: 0 },
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
