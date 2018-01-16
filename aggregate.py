import json
import sys
from rasterstats import zonal_stats

# shapefile and tif
stats = zonal_stats(sys.argv[2], sys.argv[1], stats="count sum mean", geojson_out=True)
mulu = map(lambda x: (x['properties']),stats)
print json.dumps(mulu)

