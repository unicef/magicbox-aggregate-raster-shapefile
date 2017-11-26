const bluebird = require('bluebird');
const config = require('./config');
const fs = require('fs');
const rasters_dir = config.rasters_dir
const results_dir = config.results_dir
const shapefiles_dir = config.shapefiles_dir
const aggregate = require('./aggregate_raster_by_shapefile')
const mkdirp = require('mkdirp');

const countries = fs.readdirSync(rasters_dir)
.reduce((h, country) => {
  if (country.match(/^[a-z]{3}$/)) {
    h[country] = fs.readdirSync(config.rasters_dir + country).find(file => {
      return file.match(/tif$/);
    });
  }
  return h;
}, {})

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
      rasters_dir + country_code + '/' + countries[country_code],
      shapefiles_dir + country_code + '/' + shapefile
    ).then(results => {
      mkdirp(results_dir + country_code, (err) => {
          if (err) console.error(err)
          let admin_level = shapefile.match(/\d/)[0];
          fs.writeFile(
            results_dir + country_code + '/' +
            country_code + '^' + admin_level + '^' +
            sum_up_population_per_admins(results) +
             '.json',
            JSON.stringify(results),
            (err => {
              return resolve();
            })
          )

      });
    })
  })
}

function sum_up_population_per_admins(results) {
  return results.reduce((s, obj) => {
    s += obj.sum;
    return s;
  }, 0)
}

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