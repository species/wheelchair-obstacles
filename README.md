# wheelchair-obstacles
An overpass-based map that shows wheelchair-obstacles. It can be viewed [here on github.io](http://species.github.io/wheelchair-obstacles/normal.html#16/47.0720/15.4433).

It is based on the [TransforMap demo](https://github.com/TransforMap/demo.transformap.co) Maps. It is 'forked' from [this point in time](https://github.com/TransforMap/demo.transformap.co/tree/bb5419e895d1ed440cdc645d1de8b455cfa78a8c).

## update data

for performance reason, the data displayed is a static file, only updated once in a while from overpass api.

Update:

* wget -O normal.json --post-file=normal.query "http://overpass-api.de/api/interpreter"
* wget -O athletic.json --post-file=athletic.query "http://overpass-api.de/api/interpreter"
* wget -O electro.json --post-file=electro.query "http://overpass-api.de/api/interpreter"
