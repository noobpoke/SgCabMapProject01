// Using dimple as placeholder charts for future builds.
// Will rebuild them with raw d3 to have more control.
$(function() {

    
    // Simple Control Variables
    var apiKey = 'Ga5J1UGzW0PkSVdEv89fGnA0xS49DvXe';
    var taxiLocArray = [];
    var taxiCountArray = [];
    var sampleRateInMinutes = 3; // x
    var taxiCountAxisPeriods = 20; // y
    var momentTimeNow = moment(Date.now()).startOf('minutes');
    var apiTime = momentTimeNow.format('YYYY-MM-DDTHH:mm:ss');

    // Leaflet Variables
    var leafletMap = L.map('map').setView([1.3221, 103.8378], 12);
    L.tileLayer('https://api.mapbox.com/styles/v1/zeldontay/cj2byhl9v007g2rqni9w3kshs/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiemVsZG9udGF5IiwiYSI6ImNqMmJ2dTF5MjAwMW4zM24ybGF1dmhtMG8ifQ.lOd75EV975wTQ_51bUuN1w',
        {
            attribution: 'Taxi availability data &copy; <a href="https://data.gov.sg/">Data.gov.sg</a>, Imagery &copy; <a href="https://mapbox.com/">Mapbox</a>',
            maxZoom: 18
        }).addTo(leafletMap);

    // D3 Variables
    var apiTimeToD3 = d3.time.format("%Y-%m-%dT%H:%M:%S");
    var d3timeToChartAxis = d3.time.format("%I:%M %p");
    var cscale = d3.scale.linear().domain([1, 3]).range(["#ff0000", "#ff6a00", "#ffd800", "#b6ff00", "#00ffff", "#0094ff"]);//"#00FF00","#FFA500"
    var svg = d3.select(leafletMap.getPanes().overlayPane).append("svg");
    var g = svg.append("g").attr("class", "leaflet-zoom-hide");

    // Dimple Chart Variables
    var taxiCountChartdim = {"width": 500, "height":300};
    var taxiCountSvg = dimple.newSvg("#totalTaxiCountChart", taxiCountChartdim.width, taxiCountChartdim.height);
    var taxiCountTitle_g = taxiCountSvg.append("g").attr("class", "title");
    var innerChartScale = 0.8;
    var dimpChart01 = new dimple.chart(taxiCountSvg, []);
    dimpChart01.setBounds(60,65,taxiCountChartdim.width*innerChartScale,taxiCountChartdim.height*0.55);
    var dimpChart01x = dimpChart01.addCategoryAxis("x", "Time");
    dimpChart01x.addOrderRule("Time");

    var dimpChart01y = dimpChart01.addMeasureAxis("y", "Count");
    dimpChart01y.showGridlines = false;
    dimpChart01y.title = "Taxi Count";
    dimpChart01y.tickFormat = d3.format(",");
    var dimpChart01s = dimpChart01.addSeries(null, dimple.plot.line);
    dimpChart01s.lineMarkers = true;
    dimpChart01.defaultColors[0] = new dimple.color("#00EEEE", "#6687F3");
    //dimpleChart01.afterDraw
    var dimpleChart01titleAttr = {"x": "30px", "y": "20px",};
    var dimpleChart01title02Attr = {"x": "30px", "y": "40px",};
    var dimpleChart01titleStyle = {"font-size": "26px", "fill":"white", "font-weight":"bold",
                                    "font-family": "Helvetica Neue, Helvetica, Arial, sans-serif",
                                    //"alignment-baseline": "hanging",
                                    };
    var dimpleChart01title02Style = {"font-size": "15px", "fill":"white", "font-weight":"normal",
                                    "font-family": "Helvetica Neue, Helvetica, Arial, sans-serif",
                                    //"alignment-baseline": "hanging",
                                    };
    renderTitle(taxiCountTitle_g,"Available Cabs Trend",dimpleChart01titleAttr,dimpleChart01titleStyle);
    renderTitle(taxiCountTitle_g,"in running "+sampleRateInMinutes+" minute intervals",dimpleChart01title02Attr,dimpleChart01title02Style);
    // ===== Initiate Requests Chunk =====

    requestLocationData(apiTime, renderMap);

    // Request y * x minutes of Taxi Counts from current time and Plot Chart in the last Request
    requestLoopForMinuteData(sampleRateInMinutes, taxiCountAxisPeriods);

    // Get data every x minutes (x= sample rate)
    setInterval(function() {
        momentTimeNow = moment(Date.now()).startOf('minutes');
        apiTime = momentTimeNow.format('YYYY-MM-DDTHH:mm:ss');
        console.log(apiTime);

        // Clear previous data points
        g.selectAll("path").remove(); //remove previous paths
        taxiLocArray = []; //clear previous locations
        taxiCountArray = []; //clear previous
        console.log("removed paths..");

        //Render Again
        requestLocationData(apiTime, renderMap);
        requestLoopForMinuteData(sampleRateInMinutes, taxiCountAxisPeriods);
    }, sampleRateInMinutes * 60 * 1000); // 60 * 1000 milsec


    // Request Functions
    function requestLocationData(requestTime, renderFunction){
        $.ajax({
            url: 'https://api.data.gov.sg/v1/transport/taxi-availability?date_time=' + requestTime,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("api-key", apiKey)
            },
            //data: data,
            //dataType: 'jsonp',
            success: function (data) {
                console.log(requestTime);
                // Change json string to required locations array format
                data.features[0].geometry.coordinates.forEach(function (d) {
                    taxiLocArray.push({"latitude": d[1], "longitude": d[0]});
                });
            }
        }).done(function () {
            renderFunction();
        });
    };

    function requestTaxiCountData(requestTime, renderFunction){
        $.ajax({
            url: 'https://api.data.gov.sg/v1/transport/taxi-availability?date_time=' + requestTime,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("api-key", apiKey)
            },
            success: function (data) {
                taxiCountArray.push({"Time":d3timeToChartAxis(apiTimeToD3.parse(requestTime)),"Count":data.features[0].properties.taxi_count});
            }
        }).done(function () {
            renderFunction(dimpChart01,taxiCountArray);
        });
    };

    function requestLoopForMinuteData(minGranularity,noOfLoops) {
        for (var i = 0; i < noOfLoops; i++) {
            var startTime = $.extend({}, momentTimeNow);
            var inputTime = startTime.subtract(minGranularity, "minutes").format('YYYY-MM-DDTHH:mm:ss');

            if (i == noOfLoops - 1) {
                requestTaxiCountData(inputTime, renderDimpleChart);
            } else {
                requestTaxiCountData(inputTime, function () {
                });
            }
            ;

        }
    }

    function reformatData(array) {
        var data = [];
        array.map(function (d, i) {

            data.push({
                id: i,
                type: "Feature",
                geometry: {
                    coordinates: [+d.longitude, +d.latitude],
                    type: "Point"
                }


            });
        });
        return data;
    }

    // ----- Map Render Functions --- //
    function renderMap(){
        var geoData = {type: "FeatureCollection", features: reformatData(taxiLocArray)};
        var qtree = d3.geom.quadtree(geoData.features.map(function (data, i) {
            return {
                x: data.geometry.coordinates[0],
                y: data.geometry.coordinates[1],
                all: data
            };
        }));

        //-------------------------------------------------------------------------------------
        MercatorXofLongitude = function (lon) {
            return lon * 20037508.34 / 180;
        }
        MercatorYofLatitude = function (lat) {
            return (Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
        }

        // Use Leaflet to implement a D3 geometric transformation.
        function projectPoint(x, y) {
            var point = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }

        var transform = d3.geo.transform({point: projectPoint});
        var path = d3.geo.path().projection(transform);

        updateNodes(qtree);
        leafletMap.on('moveend', mapmove);
        mapmove();

        function redrawSubset(subset) {
            path.pointRadius(3);// * scale);

            var bounds = path.bounds({type: "FeatureCollection", features: subset});
            var topLeft = bounds[0];
            var bottomRight = bounds[1];


            svg.attr("width", bottomRight[0] - topLeft[0])
                .attr("height", bottomRight[1] - topLeft[1])
                .style("left", topLeft[0] + "px")
                .style("top", topLeft[1] + "px");


            g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

            var start = new Date();


            var points = g.selectAll("path")
                .data(subset, function (d) {
                    return d.id;
                });
            points.enter().append("path");
            points.exit().remove();
            points
                .attr("d", path)
                .style("fill-opacity", function (d){
                    if (d.group) {
                        return (d.group * 0.1) + 0.2;
                    }else{
                        return 0.2;
                    }
                })
                .transition()
                .duration(1800)
                .style("fill", "#ffd800")
                ;


            console.log("updated at  " + new Date().setTime(new Date().getTime() - start.getTime()) + " ms ");

        }

        function mapmove(e) {
            var mapBounds = leafletMap.getBounds();
            var subset = search(qtree, mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth());
            console.log("subset: " + subset.length);

            redrawSubset(subset);

        }


    }

    // Find the nodes within the specified rectangle.
    function search(quadtree, x0, y0, x3, y3) {
        var pts = [];
        var subPixel = false;
        var subPts = [];
        var scale = getZoomScale();
        console.log(" scale: " + scale);
        var counter = 0;
        quadtree.visit(function (node, x1, y1, x2, y2) {
            var p = node.point;
            var pwidth = node.width * scale;
            var pheight = node.height * scale;

            // -- if this is too small rectangle only count the branch and set opacity
            if ((pwidth * pheight) <= 1) {
                // start collecting sub Pixel points
                subPixel = true;
            }
            // -- jumped to super node large than 1 pixel
            else {
                // end collecting sub Pixel points
                if (subPixel && subPts && subPts.length > 0) {

                    subPts[0].group = subPts.length;
                    pts.push(subPts[0]); // add only one todo calculate intensity
                    counter += subPts.length - 1;
                    subPts = [];
                }
                subPixel = false;
            }

            if ((p) && (p.x >= x0) && (p.x < x3) && (p.y >= y0) && (p.y < y3)) {

                if (subPixel) {
                    subPts.push(p.all);
                }
                else {
                    if (p.all.group) {
                        delete (p.all.group);
                    }
                    pts.push(p.all);
                }

            }
            // if quad rect is outside of the search rect do nto search in sub nodes (returns true)
            return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
        });
        console.log(" Number of removed  points: " + counter);
        return pts;

    }

    function updateNodes(quadtree) {
        var nodes = [];
        quadtree.depth = 0; // root

        quadtree.visit(function (node, x1, y1, x2, y2) {
            var nodeRect = {
                left: MercatorXofLongitude(x1),
                right: MercatorXofLongitude(x2),
                bottom: MercatorYofLatitude(y1),
                top: MercatorYofLatitude(y2),
            }
            node.width = (nodeRect.right - nodeRect.left);
            node.height = (nodeRect.top - nodeRect.bottom);

            if (node.depth == 0) {
                console.log(" width: " + node.width + "height: " + node.height);
            }
            nodes.push(node);
            for (var i = 0; i < 4; i++) {
                if (node.nodes[i]) node.nodes[i].depth = node.depth + 1;
            }
        });
        return nodes;
    }

    function getZoomScale() {
        var mapWidth = leafletMap.getSize().x;
        var bounds = leafletMap.getBounds();
        var planarWidth = MercatorXofLongitude(bounds.getEast()) - MercatorXofLongitude(bounds.getWest());
        var zoomScale = mapWidth / planarWidth;
        return zoomScale;

    }

    function renderDimpleChart(chart, data){
        var maxValue = d3.max(data, function(d){return +d.Count});
        var minValue = d3.min(data, function(d){return +d.Count});
        dimpChart01y.overrideMax = maxValue + 50;
        dimpChart01y.overrideMin = minValue - 200;
        chart.data = data;
        chart.draw(500);
        dimpChart01x.titleShape.remove();
    }

    function renderTitle(g, text, attr, style){
        g.append("text")
            .attr(attr)
            .style(style)
            .text(text);
    }


});
