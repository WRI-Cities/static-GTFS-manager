(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && (m[0] !== location.protocol + '//' + location.domain +
                (location.port ? ':' + location.port : ''));
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return status >= 200 && status < 300 || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function() {
            if (sent) {
                original.apply(this, arguments);
            } else {
                var that = this, args = arguments;
                setTimeout(function() {
                    original.apply(that, args);
                }, 0);
            }
        }
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)) callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function() { };
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function() { };

    x.ontimeout = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    x.onabort = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

if (typeof module !== 'undefined') module.exports = corslite;

},{}],2:[function(require,module,exports){
var haversine = (function () {
  var RADII = {
    km:    6371,
    mile:  3960,
    meter: 6371000,
    nmi:   3440
  }

  // convert to radians
  var toRad = function (num) {
    return num * Math.PI / 180
  }

  // convert coordinates to standard format based on the passed format option
  var convertCoordinates = function (format, coordinates) {
    switch (format) {
    case '[lat,lon]':
      return { latitude: coordinates[0], longitude: coordinates[1] }
    case '[lon,lat]':
      return { latitude: coordinates[1], longitude: coordinates[0] }
    case '{lon,lat}':
      return { latitude: coordinates.lat, longitude: coordinates.lon }
    case '{lat,lng}':
      return { latitude: coordinates.lat, longitude: coordinates.lng }
    case 'geojson':
      return { latitude: coordinates.geometry.coordinates[1], longitude: coordinates.geometry.coordinates[0] }
    default:
      return coordinates
    }
  }

  return function haversine (startCoordinates, endCoordinates, options) {
    options   = options || {}

    var R = options.unit in RADII
      ? RADII[options.unit]
      : RADII.km

    var start = convertCoordinates(options.format, startCoordinates)
    var end = convertCoordinates(options.format, endCoordinates)

    var dLat = toRad(end.latitude - start.latitude)
    var dLon = toRad(end.longitude - start.longitude)
    var lat1 = toRad(start.latitude)
    var lat2 = toRad(end.latitude)

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    if (options.threshold) {
      return options.threshold > (R * c)
    }

    return R * c
  }

})()

if (typeof module !== 'undefined' && module.exports) {
  module.exports = haversine
}

},{}],3:[function(require,module,exports){
(function (global){
(function () {
	'use strict';

	var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null);
	var corslite = require('corslite');
	var haversine = require('haversine');

	L.Routing = L.Routing || {};

	L.Routing.Here = L.Class.extend({
		options: {
			serviceUrl: 'https://route.api.here.com/routing/7.2/calculateroute.json',
			timeout: 30 * 1000,
			alternatives: 0,
			mode: 'fastest;car;',
			generateMode: false,
			urlParameters: {}
		},

		initialize: function (appId, appCode, options) {
			this._appId = appId;
			this._appCode = appCode;
			L.Util.setOptions(this, options);
		},

		route: function (waypoints, callback, context, options) {
			var timedOut = false,
				wps = [],
				url,
				timer,
				wp,
				i;

			options = options || {};
			url = this.buildRouteUrl(waypoints, options);

			timer = setTimeout(function () {
				timedOut = true;
				callback.call(context || callback, {
					status: -1,
					message: 'Here request timed out.'
				});
			}, this.options.timeout);

			// for (i = 0; i < waypoints.length; i++) {
			// 	wp = waypoints[i];
			// 	wps.push({
			// 		latLng: wp.latLng,
			// 		name: wp.name,
			// 		options: wp.options
			// 	});
			// }

			// Let reference here, problem when reverse geocoding point took to long, didnt have name here
			wps = waypoints;

			corslite(url, L.bind(function (err, resp) {
				var data;

				clearTimeout(timer);
				if (!timedOut) {
					if (!err) {
						data = JSON.parse(resp.responseText);
						this._routeDone(data, wps, callback, context);
					} else {
						callback.call(context || callback, {
							status: -1,
							message: 'HTTP request failed: ' + err
						});
					}
				}
			}, this));

			return this;
		},

		_routeDone: function (response, inputWaypoints, callback, context) {
			var alts = [],
				waypoints,
				waypoint,
				coordinates,
				i, j, k,
				instructions,
				distance,
				time,
				leg,
				maneuver,
				startingSearchIndex,
				instruction,
				path;

			context = context || callback;
			if (!response.response.route) {
				callback.call(context, {
					// TODO: include all errors
					status: response.type,
					message: response.details
				});
				return;
			}

			for (i = 0; i < response.response.route.length; i++) {
				path = response.response.route[i];
				coordinates = this._decodeGeometry(path.shape);
				startingSearchIndex = 0;

				instructions = [];
				time = 0;
				distance = 0;
				for (j = 0; j < path.leg.length; j++) {
					leg = path.leg[j];
					for (k = 0; k < leg.maneuver.length; k++) {
						maneuver = leg.maneuver[k];
						distance += maneuver.length;
						time += maneuver.travelTime;
						instruction = this._convertInstruction(maneuver, coordinates, startingSearchIndex);
						instructions.push(instruction);
						startingSearchIndex = instruction.index;
					}
				}

				waypoints = [];
				for (j = 0; j < path.waypoint.length; j++) {
					waypoint = path.waypoint[j];
					waypoints.push(new L.LatLng(
						waypoint.mappedPosition.latitude,
						waypoint.mappedPosition.longitude));
				}

				alts.push({
					name: path.label.join(', '),
					coordinates: coordinates,
					instructions: instructions,
					summary: {
						totalDistance: distance,
						totalTime: time,
					},
					inputWaypoints: inputWaypoints,
					waypoints: waypoints
				});
			}

			callback.call(context, null, alts);
		},

		_decodeGeometry: function (geometry) {
			var latlngs = new Array(geometry.length),
				coord,
				i;
			for (i = 0; i < geometry.length; i++) {
				coord = geometry[i].split(',');
				latlngs[i] = ([parseFloat(coord[0]), parseFloat(coord[1])]);
			}

			return latlngs;
		},

		buildRouteUrl: function (waypoints, options) {
			var locs = [],
				i,
				alternatives,
				baseUrl;

			for (i = 0; i < waypoints.length; i++) {
				locs.push('waypoint' + i + '=geo!' + waypoints[i].latLng.lat + ',' + waypoints[i].latLng.lng);
			}

			alternatives = this.options.alternatives;
			baseUrl = this.options.serviceUrl + '?' + locs.join('&');

			return baseUrl + L.Util.getParamString(L.extend({
				instructionFormat: 'text',
				app_code: this._appCode,
				app_id: this._appId,
				representation: 'navigation',
				mode: this._buildRouteMode(this.options),
				alternatives: alternatives
			}, this.options.urlParameters, this._attachTruckRestrictions(this.options)), baseUrl);
		},

		_buildRouteMode: function (options) {
			if (options.generateMode === false) {
				return options.mode;
			}
			var modes = [];
			var avoidness = [];
			var avoidnessLevel = '-3'; //strictExclude

			if (options.hasOwnProperty('routeRestriction')
				&& options.routeRestriction.hasOwnProperty('routeType')) {
				modes.push(options.routeRestriction.routeType);
			}
			else {
				modes.push('fastest');
			}

			if (options.hasOwnProperty('routeRestriction')
				&& options.routeRestriction.hasOwnProperty('vehicleType')) {
				modes.push(options.routeRestriction.vehicleType);
			} else {
				modes.push('car');
			}

			if (options.hasOwnProperty('routeRestriction')
				&& options.routeRestriction.hasOwnProperty('avoidHighways')
				&& options.routeRestriction.avoidHighways === true) {
				avoidness.push('motorway:' + avoidnessLevel);
			}

			if (options.hasOwnProperty('routeRestriction')
				&& options.routeRestriction.hasOwnProperty('avoidTolls')
				&& options.routeRestriction.avoidTolls === true) {
				avoidness.push('tollroad:' + avoidnessLevel);
			}

			if (options.hasOwnProperty('routeRestriction')
				&& options.routeRestriction.hasOwnProperty('avoidFerries')
				&& options.routeRestriction.avoidFerries === true) {
				avoidness.push('boatFerry:' + avoidnessLevel);
			}

			modes.push(avoidness.join(','));
			return modes.join(';');
		},

		_attachTruckRestrictions: function (options) {
			var _truckRestrictions = {};
			var allowedParameters = ['height', 'width', 'length', 'limitedWeight', 'weightPerAxle', 'shippedHazardousGoods'];

			if (!options.hasOwnProperty('routeRestriction')
				|| !options.hasOwnProperty('truckRestriction')
				|| !options.routeRestriction.hasOwnProperty('vehicleType')
				|| options.routeRestriction.vehicleType !== 'truck') {
				return _truckRestrictions;
			}

			if (options.truckRestriction.hasOwnProperty('shippedHazardousGoods')) {
				if (Array.isArray(options.truckRestriction['shippedHazardousGoods'])) {
					options.truckRestriction['shippedHazardousGoods'] = options.truckRestriction['shippedHazardousGoods'].join();
				}
			}

			for (var property in options.truckRestriction) {
				if (!options.truckRestriction.hasOwnProperty(property)
					|| allowedParameters.indexOf(property) === -1
					|| options.truckRestriction[property] === ''
					|| options.truckRestriction[property] === null) {
					continue;
				}

				_truckRestrictions[property] = options.truckRestriction[property];
			}
			_truckRestrictions.truckType = 'truck';

			return _truckRestrictions;
		},

		_convertInstruction: function (instruction, coordinates, startingSearchIndex) {
			var i,
				distance,
				closestDistance = 0,
				closestIndex = -1,
				coordinate = instruction.position;
			if (startingSearchIndex < 0) {
				startingSearchIndex = 0;
			}
			for (i = startingSearchIndex; i < coordinates.length; i++) {
				distance = haversine(coordinate, { latitude: coordinates[i][0], longitude: coordinates[i][1] });
				if (distance < closestDistance || closestIndex == -1) {
					closestDistance = distance;
					closestIndex = i;
				}
			}
			return {
				text: instruction.instruction,//text,
				distance: instruction.length,
				time: instruction.travelTime,
				index: closestIndex,
				type: instruction.action,
				road: instruction.roadName
			};
		},

	});

	L.Routing.here = function (appId, appCode, options) {
		return new L.Routing.Here(appId, appCode, options);
	};

	module.exports = L.Routing.Here;
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"corslite":1,"haversine":2}]},{},[3]);
