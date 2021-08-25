(function() {
	angular
	.module("cockpitModule")
	.service("cockpitModule_mapServices",CockpitModuleMapServiceController)
		function CockpitModuleMapServiceController(
				sbiModule_translate,
				sbiModule_messaging,
				cockpitModule_template,
				cockpitModule_mapThematizerServices,
				$q,
				$mdPanel,
				$rootScope,
				$location){

		var ms = this; //mapServices

		ms.setUpGeoJSONFeature = function(currFeature, config, row, configColumns, values, isSimpleMarker) {
			currFeature.set("isSimpleMarker", isSimpleMarker);
			currFeature.set("parentLayer",  config.layerID);
			currFeature.set("isWKT", false);
			currFeature.set("isGeoJSON", true);
			currFeature.set("sourceType",  (config.markerConf && config.markerConf.type ) ?  config.markerConf.type : "simple");
			ms.addDsPropertiesToFeature(currFeature, row, configColumns, values.metaData.fields);
		}

		ms.setUpWKTFeature = function(currFeature, config, row, configColumns, values) {
			currFeature.set("parentLayer",  config.layerID);
			currFeature.set("isWKT", true);
			currFeature.set("isGeoJSON", false);
			currFeature.set("sourceType",  (config.markerConf && config.markerConf.type ) ?  config.markerConf.type : "simple");
			ms.addDsPropertiesToFeature(currFeature, row, configColumns, values.metaData.fields);
		}

		ms.setUpSelectedMeasure = function(selectedMeasure, config, values) {
			if (!selectedMeasure) selectedMeasure = config.defaultIndicator;
			//get config for thematize
			if (selectedMeasure){
				if (!cockpitModule_mapThematizerServices.getCacheSymbolMinMax().hasOwnProperty(config.name+"|"+selectedMeasure)){
					cockpitModule_mapThematizerServices.loadIndicatorMaxMinVal(config.name+"|"+ selectedMeasure, values);
				}
			}
		}

		// method which convert back to JSON the geoValue field
		ms.geoFieldValueToGeoJSON = function(geoFieldValue) {
			// to convert geoFieldValue to json 
			// {type=Feature, geometry={type=Point, coordinates=[7.253000539,43.701089603]}}
			// to:
			// {"type":"Feature", "geometry":{"type":"Point", "coordinates"=[7.253000539,43.701089603]}}
			// first test if not json
			var jsonv = {};
			try {
				jsonv = JSON.parse(geoValue);
				return jsonv;
			} catch (err) {
				if (geoFieldValue.includes('=') && !geoFieldValue.includes('"')) {
					var geoValue = geoFieldValue.replace(/=/g,':');
					geoValue = geoValue.replace(/type/g,'"type"');
					// TODO: use regular expression instead of :
					geoValue = geoValue.replace('Feature','"Feature"');

					if (geoValue.includes('MultiPoint')) {
						geoValue = geoValue.replace('MultiPoint','"MultiPoint"');
					} else if (geoValue.includes('Point')) {
						geoValue = geoValue.replace('Point','"Point"');
					} else if (geoValue.includes('MultiLineString')) {
						geoValue = geoValue.replace('MultiLineString','"MultiLineString"');
					} else if (geoValue.includes('LineString')) {
						geoValue = geoValue.replace('LineString','"LineString"');
					} else if (geoValue.includes('LineString')) {
						geoValue = geoValue.replace('MultiPolygon','"MultiPolygon"');
					} else if (geoValue.includes('Polygon')) {
						geoValue = geoValue.replace('Polygon','"Polygon"');
					}

					geoValue = geoValue.replace('geometry','"geometry"');
					geoValue = geoValue.replace('coordinates','"coordinates"');
					// parse as an object
					jsonv = JSON.parse(geoValue);

					// if geojson doesn't contain type:'Feature', change the object to be GeoJSON compatible for OpenLayers
					if (geoValue.includes('type') && !geoValue.includes('Feature') && !geoValue.includes('geometry')) {
						var obj = {'type':'Feature',
								'geometry' : jsonv
							};
						//console.error('====corrected object=======================> jsonv : %o', jsonv);
						return obj;
					}
					return jsonv;
				}
			} 		
		}

		ms.getFeaturesDetails = function(geoColumn, selectedMeasure, config, configColumns, values){
			if (values != undefined){
				var geoFieldName;
				var geoFieldValue;
				var geoFieldConfig;
				var	featuresSource = new ol.source.Vector();

				for(var c=0; c < configColumns.length; c++){
					var conf = configColumns[c];
					if (conf.name === geoColumn){
						geoFieldConfig = conf;
						break;
					}
				}

				for(var k=0; k < values.metaData.fields.length; k++){
					var field = values.metaData.fields[k];
					if (field.header === geoColumn){
						geoFieldName = field.name;
						break;
					}
				}

				if (geoFieldName){
					var lon;
					var lat;
					var isSimpleMarker = true;
					for(var r=0; r < values.rows.length; r++) {
						try {
							//get coordinates
							var geometry;
							var feature;
							var row = values.rows[r];
							geoFieldValue = row[geoFieldName].trim();

							if (!geoFieldConfig.properties.coordType){
								//retrocompatibility management (just string type)
								geoFieldConfig.properties.coordType = 'string';
								geoFieldConfig.properties.coordFormat = 'lon lat';
							}
							//console.error('===========================> geoFieldValue: %s',geoFieldValue);

							if (geoFieldConfig.properties.coordType == 'json'){

								var jsonv = ms.geoFieldValueToGeoJSON(geoFieldValue);
								//console.error('===========================> jsonv : %s', jsonv);

								// if (geoFieldValue.includes('LineString') || geoFieldValue.includes('Polygon')) {
								// 	isSimpleMarker = false;
								// }
								feature = new ol.format.GeoJSON().readFeatures(jsonv, {
									dataProjection: 'EPSG:4326',
									featureProjection: 'EPSG:3857'
								});

								if (Array.isArray(feature)) {
									for (var i in feature) {
										var currFeature = feature[i];

										ms.setUpGeoJSONFeature(currFeature, config, row, configColumns, values, isSimpleMarker);
										ms.setUpSelectedMeasure(selectedMeasure, config, values);

										featuresSource.addFeature(currFeature);
									}
								} else {

									ms.setUpGeoJSONFeature(feature, config, row, configColumns, values, isSimpleMarker);
									ms.setUpSelectedMeasure(selectedMeasure, config, values);

									featuresSource.addFeature(feature);
								}
								//console.error('=====getFeaturesDetails====json==================> feature :\n %o', feature);

							} else if (geoFieldConfig.properties.coordType == 'wkt') {

								feature = new ol.format.WKT().readFeature(geoFieldValue, {
									dataProjection: 'EPSG:4326',
									featureProjection: 'EPSG:3857'
								});

								ms.setUpWKTFeature(feature, config, row, configColumns, values);
								ms.setUpSelectedMeasure(selectedMeasure, config, values);

								featuresSource.addFeature(feature);
							} else if (geoFieldConfig.properties.coordType == 'string') {
								if (geoFieldConfig.properties.coordType == 'string' && IsJsonString(geoFieldValue)){
									console.log("Location is set as STRING but its value has a JSON format. Please check the configuration: ["+geoFieldValue+"]");
									sbiModule_messaging.showInfoMessage(sbiModule_translate.load('sbi.cockpit.map.stringInvalid').replace("{0}",geoColumn).replace("{1}",geoFieldValue.substring(0,20)+'...'), 'Title', 0);
									return null;
								}
								isSimpleMarker = true;
								geometry = ms.getGeometry(geoColumn, geoFieldConfig, geoFieldValue);

								//set ol objects
								feature = new ol.Feature(geometry);

								//at least add the layer owner
								feature.set("parentLayer",  config.layerID);
								feature.set("isSimpleMarker", isSimpleMarker);
								feature.set("sourceType",  (config.markerConf && config.markerConf.type ) ?  config.markerConf.type : "simple");
								ms.addDsPropertiesToFeature(feature, row, configColumns, values.metaData.fields);
								ms.setUpSelectedMeasure(selectedMeasure, config, values);

								featuresSource.addFeature(feature);
							}
						} catch(err) {
							if (!geoFieldValue)
								console.error("Error getting feature from row " + r + " spatial attribute is empty, Skipping to the next row...");
							else
								console.error("Error getting feature from row " + r + ". The original error was: " + err + "\n geoFieldValue :" + geoFieldValue + "\n Skipping to the next row...");
						}
					}

					return featuresSource;
				}
			}
			return new ol.source.Vector();
		}

		function IsJsonString(str) {
		    try {
		        JSON.parse(str);
		    } catch (e) {
		        return false;
		    }
		    return true;
		}

		ms.getSimpleCoordinates = function(geocol, config, value){
			var coord;
			if (Array.isArray(value))
				coord = value;
			else{
				if (value.indexOf(" ") > 0) {
					coord = value.split(" ");
				} else if (value.indexOf(",")) {
					coord = value.split(",");
				} else{
					sbiModule_messaging.showInfoMessage(sbiModule_translate.load('sbi.cockpit.map.lonLatError').replace("{0}",geocol).replace("{1}",value.substring(0,20)+'...'), 'Title', 0);
					console.log("Error getting longitude and latitude from column value ["+ geocol +"]. Check the dataset and its metadata.");
					return null;
				}
				if (coord.length != 2){
					sbiModule_messaging.showInfoMessage(sbiModule_translate.load('sbi.cockpit.map.lonLatError').replace("{0}",geocol).replace("{1}",value.substring(0,20)+'...'), 'Title', 0);
					console.log("Error getting longitude and latitude from column value ["+ geocol +"]. Check the dataset and its metadata.");
					return null;
				}
			}

			//setting lon, lat values with correct order (LON, LAT)
			var lat, lon;
			switch(config.properties.coordFormat) {
			case "lat lon":
				lon = (typeof coord[1]  === 'string') ? parseFloat(coord[1].trim()) : coord[1];
				lat = (typeof coord[0]  === 'string') ? parseFloat(coord[0].trim()) : coord[0];
				break;
			case "lon lat":
			default:
				lon = (typeof coord[0]  === 'string') ? parseFloat(coord[0].trim()) : coord[0];
				lat = (typeof coord[1]  === 'string') ? parseFloat(coord[1].trim()) : coord[1];
			}

			return [lon, lat];
		}

		ms.getGeometry = function(geocol, config, value){
			var geometry;
			var coordinates = [];
			var transform = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');

			if (config.properties.coordType.toUpperCase() == "STRING") {
				coordinates =  transform(ms.getSimpleCoordinates(geocol, config, value));
			} else {
				config.coordinates.forEach(function(coords){
						for (var i in coords) {
							var coordinate;
							if (Array.isArray(coords[i])) {
								if (Array.isArray(coords[i][0])) {
									for (var j in coords[i]) {
										coordinate = transform(ms.getSimpleCoordinates(geocol, config, coords[i][j]));
										coordinates.push(coordinate);
									}
								} else {
									coordinate = transform(ms.getSimpleCoordinates(geocol, config, coords[i]));
									coordinates.push(coordinate);
								}

							 } else {
								 var coordinate = transform(ms.getSimpleCoordinates(geocol, config, coords));
								 coordinates = coordinate; //point has already an array
								 break;
							 }
						 }
				});
		    }

			switch(config.type.toUpperCase()) {
			case "POINT":
		    	geometry = new ol.geom.Point(coordinates);
		        break;
			case "MULTIPOINT":
		    	geometry = new ol.geom.MultiPoint([coordinates]);
		    	break;
		    case "MULTIPOLYGON":
		    	geometry = new ol.geom.MultiPolygon([[coordinates]]);
		    	break;
		    case "POLYGON":
		    	geometry = new ol.geom.Polygon([coordinates]);
		    	break;
		    case "LINESTRING":
		    	geometry = new ol.geom.LineString([coordinates]);
		    	break;
		    case "MULTILINESTRING":
		    	geometry = new ol.geom.MultiLineString([coordinates]);
		    	break;
//		    case "CIRCLE":
//		    	geometry = new ol.geom.Circle([coordinates],?);
//		        break;
//		    case "LINEARRING":
//		    	geometry = new ol.geom.LinearRing([coordinates]);
//		    	break;
		    default:
		    	geometry = new ol.geom.Point(coordinates);
		    	break;
			}
	        return geometry;
		}

		ms.getColumnConfigByProp = function(configColumns, propName, propValue){
			for(var c=0; c < configColumns.length; c++){
				var conf = configColumns[c];
				if (conf[propName] === propValue){
					return conf;
				}
			}

			return null;
		}

		ms.addDsPropertiesToFeature = function (f, row, cols, meta){
			//add columns value like properties
			for (c in row){
				var header = ms.getHeaderByColumnName(c, meta);
				var prop = {};
				prop.value = row[c];
				for (p in cols){
					if (cols[p] && cols[p].alias == header){
						prop.type = cols[p].fieldType;
						prop.aggregationSelected = ( cols[p].properties && cols[p].aggregationSelected) ? cols[p].aggregationSelected : '';
						prop.thresholdsConfig =  ( cols[p].properties && cols[p].properties.thresholds) ? cols[p].properties.thresholds : null;
						break;
					}
				}
				f.set(header, prop);
			}
		}

		ms.getHeaderByColumnName = function(cn, fields) {
			var toReturn = cn;

			for (n in fields){
				if (fields[n] && fields[n].name === cn){
					return fields[n].header;
				}
			}
			return toReturn;
		}

		ms.updateCoordinatesAndZoom = function(model, map, l, setValues){
				var coord;
				var zoom;
				var source;

				/*
				 * WORKAROUND : Fix center point for widgets with WKT layer saved
				 * before the commit 44eff10
				 */
				if (!(model.content.currentView.center instanceof Array)
						|| (model.content.currentView.center instanceof Array
								&& isNaN(model.content.currentView.center[0]))) {
					model.content.currentView.center = [0,0];
				}

				if (model.content.currentView.center[0] == 0 && model.content.currentView.center[1] == 0){
					if (l.getSource() && l.getSource().getSource)
						source = l.getSource().getSource(); //cluster case
					else
						source = l.getSource();

					if (source.getFeatures().length>0){
						if (source.getFeatures()[0].get("isWKT")){

							var toSum = function(a,b) {
								return [a[0]+b[0], a[1]+b[1]];
							};

							var geometry = source.getFeatures()[0].getGeometry();
							if (geometry instanceof ol.geom.GeometryCollection) {

								var coords = [];

								// Center the map on all coordinates of all geometries
								for (var i=0; i<geometry.getGeometries().length; i++) {
									var coordinates = geometry.getGeometries()[i].getCoordinates();
									// Coordinates can be an Array<Number> or Array<Array<Number>>
									if (coordinates[0] instanceof Array) {
										for (var j=0; j<coordinates.length; j++) {
											coords.push(coordinates[j]);
										}
									} else {
										coords.push(coordinates);
									}
								}
								var length = coords.length;
								coord = coords.reduce(toSum)
									.map(function(element, index, array) {
										return array[index] / length;
									});

							} else if (geometry instanceof ol.geom.LineString) {

								var coordsMatrix = geometry.getCoordinates();
								var length = coordsMatrix.length;

								coord = coordsMatrix.reduce(toSum)
									.map(function(element, index, array) {
										return array[index] / length;
									});

							} else if (geometry instanceof ol.geom.Polygon) {

								var coordsMatrix = geometry.getCoordinates();
								var coords = [];

								for (var i in coordsMatrix) {
									var currCoordArray = coordsMatrix[i];
									for (var j in currCoordArray) {
										var currCoord = currCoordArray[j];
										coords.push(currCoord);
									}

								}

								var length = coords.length;
								coord = coords.reduce(toSum)
									.map(function(element, index, array) {
										return array[index] / length;
									});

							} else if(geometry instanceof ol.geom.Point) {
								coord = geometry.getCoordinates();
							} else {
								console.log("Cannot determine the center of geomerty: " + geometry);
							}

						} else {
							//string && json
							if (source.getFeatures()[0].getGeometry().getType().toUpperCase() == 'POINT')
								coord = source.getFeatures()[0].getGeometry().getCoordinates();
							else if (source.getFeatures()[0].getGeometry().getType().toUpperCase() == 'POLYGON' ||
							source.getFeatures()[0].getGeometry().getType().toUpperCase() == 'MULTIPOLYGON')
								coord = source.getFeatures()[0].getGeometry().getCoordinates()[0][0][0];
							else
								coord = source.getFeatures()[0].getGeometry().getCoordinates()[0][0];
						}
					}
					if(source.getFeatures().length>35){
						zoom = 4;
					}else{
						zoom = 5;
					}

					//update coordinates and zoom within the template
					model.content.currentView.center = coord;
					model.content.currentView.zoom = zoom;

					if (setValues){
						map.getView().setCenter(coord);
						map.getView().setZoom(zoom);
					}
				}
		}


		ms.getBaseLayer = function (conf){

			var toReturn;

			//check input configuration
			if (!conf || !conf.type){
				conf = {type:""}; //default case
			}

			switch(conf.type) {
			    case "OSM": case "OAM":
			    	toReturn = new ol.layer.Tile({
			   	    	visible: true,
			   	    	source: new ol.source.OSM({
				   	    	url:conf.url,
				   	    	attributions: conf.attributions || "",
			   	    		})
						});
			        break;
			    case "Stamen":
			    	//layer: watercolor, toner-hybrid, toner, toner-background, toner-hybrid, toner-labels, toner-lines, toner-lite,terrain, terrain-background, terrain-labels, terrain-lines
			    	toReturn = new ol.layer.Tile({
			   	    	visible: true,
			   	    	source: new ol.source.Stamen({
				   	    	layer: conf.layer,
			   	    		})
						});
			        break;
			    case "XYZ": //generic tiles (ex. for carto)
			    	toReturn = new ol.layer.Tile({
			   	    	visible: true,
			   	    	source: new ol.source.XYZ({
				   	    	url:conf.url,
				   	    	attributions: conf.attributions || "",
			   	    		})
						});
			    	break;
			    default: //OSM
			    		toReturn = new ol.layer.Tile({
				    		visible: true,
				      	    source: new ol.source.OSM()
				      	});
			}
			return toReturn;
		}

		ms.getColumnName = function(key, values){
			var toReturn = key.substring(key.indexOf('|')+1);;
			for (var v=0; v<values.length; v++){
				if (values[v].header === toReturn)
					return values[v].name;
			}

			return toReturn;
		}

		ms.isCluster = function(feature) {
		  if (!feature || !feature.get('features')) {
		        return false;
		  }
		  return feature.get('features').length > 1;
		}
	}

})();