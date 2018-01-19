var PythonShell = require('python-shell');

exports.aggregate_raster_by_shapefile = (raster_path, shapefile_path, output_type, python2_path) => {
  var options = {
    pythonOptions: ['-W ignore'],
    pythonPath: python2_path,
    args: [raster_path, shapefile_path, output_type]
  };
  return new Promise((resolve, reject) => {
    let parsed = {};
    PythonShell.run('aggregate.py', options, function (err, data) {
      if (err) throw err;

      // get properties for this shapefile if we have it
      try {
        let enriched = JSON.parse(data[0]).map(obj => {
          return add_admin_id(obj)
        })

        resolve(
          enriched
        )
      } catch (e) {
        // Reject object that does not have required properties in aggregation
        reject(new Error(`Properties not found in the output of rasterstats for shapefile: ${shapefile_path}, raster: ${raster_path}`))
      }

    });
  })
}

/**
 * Returns admin id per coordinates
 * @param  {Object} shape_obj admin
 * @return {Object} admin
 */
function add_admin_id(shape_obj) {
  let iso = shape_obj.ISO.toLowerCase();
  let ids = Object.keys(shape_obj).filter(k => {
    return k.match(/^ID_\d+/i) && shape_obj[k];
  }).map(k => {
    if (shape_obj[k]) {
      return shape_obj[k]
    }
  }).join('_')

  let admin_id = [iso, ids, 'gadm2-8'].join('_');
  shape_obj.admin_id = admin_id;
  return shape_obj;
}
