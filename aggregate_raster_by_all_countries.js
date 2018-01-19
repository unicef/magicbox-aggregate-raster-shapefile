const bluebird = require('bluebird');
const config = require('./config');
const fs = require('fs');
// Directory with rasters
const rasters_dir = config.rasters_dir
// Dir where we send results
const results_dir = config.results_dir
// Dir with Shapefiles
const shapefiles_dir = config.shapefiles_dir
const aggregate = require('./aggregate_raster_by_shapefile')
const mkdirp = require('mkdirp');

// Create lookup of country code to rasterfile path 
// Example: arm: ./data/rasters/arm/ARG_ppp_v2b_2015_UNadj
const create_lookup_country_code_table = function(single_raster, config) {
  let table = {}
  // Default directory to get a list of country codes is 
  // config.rasters_dir, however, if we have a single raster, we 
  // have to get all country codes from the shapefiles directory
  let directory = !!single_raster ? config.shapefiles_dir : config.rasters_dir 

  // Get all subdirectories that matches our pattern for
  // country_code inside directory
  let country_codes = fs.readdirSync(directory).filter((element) => {
    return !!element.match(/^[a-z]{3}$/i)
  })

  // if we have only one raster
  if (!!single_raster) {
    // all country codes will point to it
    country_codes.reduce((lookup_table, country_code) => {
      lookup_table[country_code] = single_raster
      return lookup_table
    }, table)
  } else {
    // we look into each subdirectory of config.rasters_dir
    // and get the appropriate rasterfile
    country_codes.reduce((lookup_table, country_code) => {
      let filename = fs.readdirSync(config.rasters_dir + country_code).find((filename) => {
        return !!filename.match(/tif$/)
      })

      lookup_table[country_code] = config.rasters_dir + country_code + '/' + filename 

      return lookup_table
    })
  }

  return table
}

// Output type indicates what fields will be present in the output
// it can be "sum" or "mean"
// with sum the output will contain the fields "count" and "sum"
// with mean the output will contain the fields "count", "mean" and "max"
// If we have received a single raster to process, it should output "mean"
// otherwise, it should do "sum"
const output_type = !!process.argv[2] ? 'mean' : 'sum'

// Load lookup table in global variable
const countries = create_lookup_country_code_table(process.argv[2], config)

// Aggregate a country's raster by each admin level shapefile for that country
function aggregate_raster_by_all_country_shapefiles(country_code) {
  return new Promise((resolve, reject) => {
    let shapefiles = fs.readdirSync(shapefiles_dir + country_code)
    .filter( f => { return f.match(/.shp$/)})
    bluebird.each(shapefiles, shapefile => {
      return aggregate_and_save_results(country_code, shapefile)
    }, {concurrency: 1})
    .then(resolve)
  })
}
function aggregate_and_save_results(country_code, shapefile) {
  console.log(country_code, shapefile)
  return new Promise((resolve, reject) => {
    aggregate.aggregate_raster_by_shapefile(
      countries[country_code],
      shapefiles_dir + country_code + '/' + shapefile,
      output_type,
      config.python2_path
    ).then(results => {
      mkdirp(results_dir + country_code, (err) => {
          if (err) console.error(err)
          let admin_level = shapefile.match(/\d/)[0];
          fs.writeFile(
            get_result_filename(
              results_dir,
              country_code,
              admin_level,
              output_type,
              results
            ),
            JSON.stringify(results),
            (err => {
              return resolve();
            })
          )

      });
    }).catch((err) => {
      // print the error
      console.error(err)
      // resolve the promise to keep the process going
      resolve()
    })
  })
}

function get_result_filename(path, country_code, admin_level, output_type, data) {
  let sum_name_extension = output_type == 'sum' ? '^' + sum_up_population_per_admins(data) : ''
  return (path + country_code + '/' + country_code + '^' + admin_level + sum_name_extension + '.json')
}

function sum_up_population_per_admins(results) {
  return results.reduce((s, obj) => {
    s += obj.sum;
    return s;
  }, 0)
}

// Loop through country codes
// and aggregate country raster
// by each shapefile for that country
const country_codes = Object.keys(countries);
bluebird.each(country_codes, country_code => {
  console.log('Getting', country_code)
  // if (start_country && start_country.match(/country_code/i)) {
  //   go_live = true
  // }
  // if (!go_live) {
  //   return
  // }
  return aggregate_raster_by_all_country_shapefiles(country_code)
}, {concurrency: 1})
.then(process.exit)
