d3.json("/statistics/queue-length", function (error, json_data) {
  if (error) return console.warn(error);

  var chart = c3.generate({
    bindto: "#chart-queue-length",
    data: {
      json: json_data,
      keys: {
        x: "queue_name",
        value: ["running", "submitted"],
      },
      type: "bar",
      groups: [["running", "submitted"]],
      colors: {
        running: "#edce2f",
        submitted: "#4797ae",
      },
    },
    axis: {
      x: {
        type: "category",
      },
      rotated: true,
    },
    padding: {
      top: 20,
      right: 120,
      bottom: 20,
      left: 120,
    },
  });
});
