import json
import sys
from rasterstats import zonal_stats

# parameter -> fields present in the output
stats_options = {
   "sum": "count sum",
   "mean": "count mean max"
}

# shapefile and tif
stats = zonal_stats(sys.argv[2], sys.argv[1], stats=stats_options[sys.argv[3]], geojson_out=True)
mulu = map(lambda x: (x['properties']),stats)
print json.dumps(mulu)

