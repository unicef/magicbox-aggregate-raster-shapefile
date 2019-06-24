const bluebird = require('bluebird');
const config = require('./config');

const fs = require('fs');
// Directory with rasters
const raster = config.raster
// Dir where we send results
const results_dir = config.results_dir
// Dir with Shapefiles
const shapefiles_dir = config.shapefiles_dir
const aggregate = require('./aggregate_raster_by_shapefile')
const mkdirp = require('mkdirp');

// Create lookup of country code to raster name
// Example: arm: ARG_ppp_v2b_2015_UNadj
let countries = fs.readdirSync(shapefiles_dir)
.reduce((a, country) => {
  if (country.match(/^[a-z]{3}$/i)) {
    a.push(country)
    // h[country] = fs.readdirSync(config.shapefiles_dir + country).find(file => {
    //   return file.match(/tif$/);
    // });
  }
  return a;
}, [])
index = countries.indexOf('UZB');
countries = countries.slice(index, countries.length);
console.log(countries)
// Aggregate a country's raster by each admin level shapefile for that country
function aggregate_raster_by_all_country_shapefiles(country_code) {
  return new Promise((resolve, reject) => {
    let shapefiles = fs.readdirSync(shapefiles_dir + country_code)
    .filter( f => { return f.match(/.shp$/)})
    console.log(shapefiles)
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
      raster,
      shapefiles_dir + country_code + '/' + shapefile
    ).then(results => {
      console.log(shapefile)
      require('jsonfile').writeFile(results_dir + shapefile.replace('gadm36_', '').replace('.shp', '.json'), results, (err, data) => { return resolve()})
      // mkdirp(results_dir + country_code, (err) => {
      //     if (err) console.error(err)
      //     let admin_level = shapefile.match(/\d/)[0];
      //     fs.writeFile(
      //       results_dir + country_code + '/' +
      //       country_code + '^' + admin_level + '^' +
      //       sum_up_population_per_admins(results) +
      //        '.json',
      //       JSON.stringify(results),
      //       (err => {
      //         return resolve();
      //       })
      //     )
      //
      // });
    })
  })
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
// const country_codes = Object.keys(countries);
bluebird.each(countries, country_code => {
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
