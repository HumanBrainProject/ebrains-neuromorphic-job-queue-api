var now = new Date();
var today = now.toISOString().substring(0, 10);

d3.json(
  "/statistics/cumulative-job-count?start=2015-06-22&end=" +
    today +
    "&interval=7",
  function (error, job_stats) {
    if (error) return console.warn(error);

    /* pull the job counts out of the job_counts dict so c3 can plot them */
    job_stats.forEach(function (entry) {
      for (var platform in entry.count) {
        entry[platform] = entry.count[platform];
      }
    });

    var chart = c3.generate({
      bindto: "#chart-cumulative-job-count",
      data: {
        json: job_stats,
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
            text: "Number of completed jobs (cumulative)",
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
