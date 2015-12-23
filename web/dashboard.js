// You can set the following variables before loading this script:
//
// var netdataNoDygraphs = true;		// do not use dygraph
// var netdataNoSparklines = true;		// do not use sparkline
// var netdataNoPeitys = true;			// do not use peity
// var netdataNoGoogleCharts = true;	// do not use google
// var netdataNoMorris = true;			// do not use morris
// var netdataNoEasyPieChart = true;	// do not use easy pie chart
// var netdataNoBootstrap = true;		// do not load bootstrap
// var netdataDontStart = true;			// do not start the thread to process the charts
//
// You can also set the default netdata server, using the following.
// When this variable is not set, we assume the page is hosted on your
// netdata server already.
// var netdataServer = "http://yourhost:19999"; // set your NetData server

//(function(window, document, undefined) {
	// fix IE issue with console
	if(!window.console){ window.console = {log: function(){} }; }

	// global namespace
	var NETDATA = window.NETDATA || {};

	// ----------------------------------------------------------------------------------------------------------------
	// Detect the netdata server

	// http://stackoverflow.com/questions/984510/what-is-my-script-src-url
	// http://stackoverflow.com/questions/6941533/get-protocol-domain-and-port-from-url
	NETDATA._scriptSource = function(scripts) {
		var script = null, base = null;

		if(typeof document.currentScript !== 'undefined') {
			script = document.currentScript;
		}
		else {
			var all_scripts = document.getElementsByTagName('script');
			script = all_scripts[all_scripts.length - 1];
		}

		if (typeof script.getAttribute.length !== 'undefined')
			script = script.src;
		else
			script = script.getAttribute('src', -1);

		var link = document.createElement('a');
		link.setAttribute('href', script);

		if(!link.protocol || !link.hostname) return null;

		base = link.protocol;
		if(base) base += "//";
		base += link.hostname;

		if(link.port) base += ":" + link.port;
		base += "/";

		return base;
	};

	if(typeof netdataServer !== 'undefined')
		NETDATA.serverDefault = netdataServer;
	else
		NETDATA.serverDefault = NETDATA._scriptSource();

	if(NETDATA.serverDefault === null)
		NETDATA.serverDefault = '';
	else if(NETDATA.serverDefault.slice(-1) !== '/')
		NETDATA.serverDefault += '/';

	// default URLs for all the external files we need
	// make them RELATIVE so that the whole thing can also be
	// installed under a web server
	NETDATA.jQuery       		= NETDATA.serverDefault + 'lib/jquery-1.11.3.min.js';
	NETDATA.peity_js     		= NETDATA.serverDefault + 'lib/jquery.peity.min.js';
	NETDATA.sparkline_js 		= NETDATA.serverDefault + 'lib/jquery.sparkline.min.js';
	NETDATA.easypiechart_js 	= NETDATA.serverDefault + 'lib/jquery.easypiechart.min.js';
	NETDATA.dygraph_js   		= NETDATA.serverDefault + 'lib/dygraph-combined.js';
	NETDATA.dygraph_smooth_js   = NETDATA.serverDefault + 'lib/dygraph-smooth-plotter.js';
	NETDATA.raphael_js   		= NETDATA.serverDefault + 'lib/raphael-min.js';
	NETDATA.morris_js    		= NETDATA.serverDefault + 'lib/morris.min.js';
	NETDATA.morris_css   		= NETDATA.serverDefault + 'css/morris.css';
	NETDATA.dashboard_css		= NETDATA.serverDefault + 'dashboard.css';
	NETDATA.google_js    		= 'https://www.google.com/jsapi';

	// these are the colors Google Charts are using
	// we have them here to attempt emulate their look and feel on the other chart libraries
	// http://there4.io/2012/05/02/google-chart-color-list/
	//NETDATA.colors		= [ '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#3B3EAC', '#0099C6',
	//						'#DD4477', '#66AA00', '#B82E2E', '#316395', '#994499', '#22AA99', '#AAAA11',
	//						'#6633CC', '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC' ];

	NETDATA.colors		= [ '#3366CC', '#DC3912', '#109618', '#FF9900', '#990099', '#DD4477', '#3B3EAC',
							'#66AA00', '#0099C6', '#B82E2E', '#AAAA11', '#5574A6', '#994499', '#22AA99',
							'#6633CC', '#E67300', '#316395', '#8B0707', '#329262', '#3B3EAC' ];
	// an alternative set
	// http://www.mulinblog.com/a-color-palette-optimized-for-data-visualization/
	//                         (blue)     (red)      (orange)   (green)    (pink)     (brown)    (purple)   (yellow)   (gray)
	//NETDATA.colors 		= [ '#5DA5DA', '#F15854', '#FAA43A', '#60BD68', '#F17CB0', '#B2912F', '#B276B2', '#DECF3F', '#4D4D4D' ];

	// ----------------------------------------------------------------------------------------------------------------
	// the defaults for all charts

	// if the user does not specify any of these, the following will be used

	NETDATA.chartDefaults = {
		host: NETDATA.serverDefault,	// the server to get data from
		width: '100%',					// the chart width - can be null
		height: '100%',					// the chart height - can be null
		min_width: null,				// the chart minimum width - can be null
		library: 'dygraph',				// the graphing library to use
		method: 'average',				// the grouping method
		before: 0,						// panning
		after: -600,					// panning
		pixels_per_point: 1,			// the detail of the chart
		fill_luminance: 0.8				// luminance of colors in solit areas
	}

	// ----------------------------------------------------------------------------------------------------------------
	// global options

	NETDATA.options = {
		readyCallback: null,			// a callback when we load the required stuf
		pauseCallback: null,			// a callback when we are really paused

		pause: false,					// when enabled we don't auto-refresh the charts

		targets: null,					// an array of all the state objects that are
										// currently active (independently of their
										// viewport visibility)

		updated_dom: true,				// when true, the DOM has been updated with
										// new elements we have to check.

		auto_refresher_fast_weight: 0,	// this is the current time in ms, spent
										// rendering charts continiously.
										// used with .current.fast_render_timeframe

		page_is_visible: true,			// when true, this page is visible

		auto_refresher_stop_until: 0,	// timestamp in ms - used internaly, to stop the
										// auto-refresher for some time (when a chart is
										// performing pan or zoom, we need to stop refreshing
										// all other charts, to have the maximum speed for
										// rendering the chart that is panned or zoomed).
										// Used with .current.global_pan_sync_time

		last_resized: 0,				// the timestamp of the last resize request

		crossDomainAjax: false,			// enable this to request crossDomain AJAX

		last_page_scroll: 0,			// the timestamp the last time the page was scrolled

		// the current profile
		// we may have many...
		current: {
			pixels_per_point: 1,		// the minimum pixels per point for all charts
										// increase this to speed javascript up
										// each chart library has its own limit too
										// the max of this and the chart library is used
										// the final is calculated every time, so a change
										// here will have immediate effect on the next chart
										// update

			idle_between_charts: 100,	// ms - how much time to wait between chart updates

			fast_render_timeframe: 200, // ms - render continously until this time of continious
										// rendering has been reached
										// this setting is used to make it render e.g. 10
										// charts at once, sleep idle_between_charts time
										// and continue for another 10 charts.

			idle_between_loops: 500,	// ms - if all charts have been updated, wait this
										// time before starting again.

			idle_parallel_loops: 100,	// ms - the time between parallel refresher updates

			idle_lost_focus: 500,		// ms - when the window does not have focus, check
										// if focus has been regained, every this time

			global_pan_sync_time: 1000,	// ms - when you pan or zoon a chart, the background
										// autorefreshing of charts is paused for this amount
										// of time

			sync_selection_delay: 1500,	// ms - when you pan or zoom a chart, wait this amount
										// of time before setting up synchronized selections
										// on hover.

			sync_selection: true,		// enable or disable selection sync

			pan_and_zoom_delay: 50,		// when panning or zooming, how ofter to update the chart

			sync_pan_and_zoom: true,	// enable or disable pan and zoom sync

			update_only_visible: true,	// enable or disable visibility management

			parallel_refresher: true,	// enable parallel refresh of charts

			concurrent_refreshes: true,	// when parallel_refresher is enabled, sync also the charts

			destroy_on_hide: false,		// destroy charts when they are not visible

			eliminate_zero_dimensions: true, // do not show dimensions with just zeros

			stop_updates_when_focus_is_lost: true, // boolean - shall we stop auto-refreshes when document does not have user focus
			stop_updates_while_resizing: 1000,	// ms - time to stop auto-refreshes while resizing the charts

			double_click_speed: 500,	// ms - time between clicks / taps to detect double click/tap

 			smooth_plot: true,			// enable smooth plot, where possible

 			color_fill_opacity_line: 1.0,
 			color_fill_opacity_area: 0.2,
			color_fill_opacity_stacked: 0.8,

			setOptionCallback: function() { ; }
		},

		debug: {
			show_boxes: 		false,
			main_loop: 			false,
			focus: 				false,
			visibility: 		false,
			chart_data_url: 	false,
			chart_errors: 		false,
			chart_timing: 		false,
			chart_calls: 		false,
			libraries: 			false,
			dygraph: 			false
		}
	}


	// ----------------------------------------------------------------------------------------------------------------
	// local storage options

	NETDATA.objectToLocalStorage = function(obj, prefix) {
		if(typeof Storage !== "undefined" && typeof localStorage === 'object') {
			for(var i in obj) {
				if(typeof obj[i] === 'object') {
					//console.log('object ' + prefix + '.' + i.toString());
					NETDATA.objectToLocalStorage(obj[i], prefix + '.' + i.toString());
					continue;
				}

				var value = localStorage.getItem(prefix + '.' + i.toString());
				if(value === null) {
					switch(typeof obj[i]) {
						case 'boolean':
						case 'number':
							//console.log('write ' + prefix + '.' + i.toString() + ' = ' + obj[i].toString());
							localStorage.setItem(prefix + '.' + i.toString(), obj[i].toString())
							break;
					}
					continue;
				}

				switch(typeof obj[i]) {
					case 'boolean':
						if(value === 'true' || value === 'false') {
							obj[i] = (value === 'false')?false:true;
							//console.log('read ' + prefix + '.' + i.toString() + ' = ' + obj[i].toString());
						}
						//else console.log('ignoring ' + i.toString());
						break;

					case 'number':
						var n = parseFloat(value);
						if(isNaN(n) === false) {
							obj[i] = n;
							// console.log('read ' + prefix + '.' + i.toString() + ' = ' + obj[i].toString());
						}
						// else console.log('ignoring ' + i.toString());
						break;
				}
			}
		}
	}

	NETDATA.setOption = function(key, value) {
		var ret = false;

		switch(typeof NETDATA.options.current[key]) {
			case 'boolean':
				if(value) NETDATA.options.current[key] = true;
				else NETDATA.options.current[key] = false;
				localStorage.setItem('options.' + key.toString(), NETDATA.options.current[key].toString());
				ret = true;
				break;

			case 'number':
				if(typeof value === 'number') {
					NETDATA.options.current[key] = value;
					localStorage.setItem('options.' + key.toString(), NETDATA.options.current[key].toString());
					ret = true;
				}
				//else
				//	console.log('invalid number given for option key ' + key.toString);
				break;

			case 'function':
				if(typeof value === 'function') {
					NETDATA.options.current[key] = value;
					ret = true;
				}
				//else
				//	console.log('invalid function given for option key ' + key.toString);
				break;

			default:
				// console.log('cannot find option key ' + key.toString());
				break;
		}

		if(ret === true)
			NETDATA.options.current.setOptionCallback();

		return ret;
	}

	NETDATA.getOption = function(key) {
		return NETDATA.options.current[key];
	}

	NETDATA.resetOptions = function() {
		// console.log('will reset all');
		for(var i in NETDATA.options.defaults) {
			if(i.toString() === 'setOptionCallback') continue;

			if(NETDATA.options.current[i] !== NETDATA.options.defaults[i]) {
				// console.log('reseting ' + i.toString() + ' to ' + NETDATA.options.defaults[i].toString());
				NETDATA.setOption(i, NETDATA.options.defaults[i]);
			}
		}
	}

	// ----------------------------------------------------------------------------------------------------------------

	if(NETDATA.options.debug.main_loop === true)
		console.log('welcome to NETDATA');

	window.onresize = function(event) {
		NETDATA.options.last_page_scroll = new Date().getTime();
		NETDATA.options.last_resized = new Date().getTime();
	};

	window.onscroll = function(event) {
		NETDATA.options.last_page_scroll = new Date().getTime();
		if(NETDATA.options.targets === null) return;

		// when the user scrolls he sees that we have
		// hidden all the not-visible charts
		// using this little function we try to switch
		// the charts back to visible quickly
		var targets = NETDATA.options.targets;
		var len = targets.length;
		while(len--) targets[len].isVisible();
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Error Handling

	NETDATA.errorCodes = {
		100: { message: "Cannot load chart library", alert: true },
		101: { message: "Cannot load jQuery", alert: true },
		402: { message: "Chart library not found", alert: false },
		403: { message: "Chart library not enabled/is failed", alert: false },
		404: { message: "Chart not found", alert: false }
	};
	NETDATA.errorLast = {
		code: 0,
		message: "",
		datetime: 0
	};

	NETDATA.error = function(code, msg) {
		NETDATA.errorLast.code = code;
		NETDATA.errorLast.message = msg;
		NETDATA.errorLast.datetime = new Date().getTime();

		console.log("ERROR " + code + ": " + NETDATA.errorCodes[code].message + ": " + msg);

		if(NETDATA.errorCodes[code].alert)
			alert("ERROR " + code + ": " + NETDATA.errorCodes[code].message + ": " + msg);
	}

	NETDATA.errorReset = function() {
		NETDATA.errorLast.code = 0;
		NETDATA.errorLast.message = "You are doing fine!";
		NETDATA.errorLast.datetime = 0;
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Chart Registry

	// When multiple charts need the same chart, we avoid downloading it
	// multiple times (and having it in browser memory multiple time)
	// by using this registry.

	// Every time we download a chart definition, we save it here with .add()
	// Then we try to get it back with .get(). If that fails, we download it.

	NETDATA.chartRegistry = {
		charts: {},

		fixid: function(id) {
			return id.replace(/:/g, "_").replace(/\//g, "_");
		},

		add: function(host, id, data) {
			host = this.fixid(host);
			id   = this.fixid(id);

			if(typeof this.charts[host] === 'undefined')
				this.charts[host] = {};

			//console.log('added ' + host + '/' + id);
			this.charts[host][id] = data;
		},

		get: function(host, id) {
			host = this.fixid(host);
			id   = this.fixid(id);

			if(typeof this.charts[host] === 'undefined')
				return null;

			if(typeof this.charts[host][id] === 'undefined')
				return null;

			//console.log('cached ' + host + '/' + id);
			return this.charts[host][id];
		},

		downloadAll: function(host, callback) {
			while(host.slice(-1) === '/')
				host = host.substring(0, host.length - 1);

			var self = this;

			$.ajax({
				url: host + '/api/v1/charts',
				crossDomain: NETDATA.options.crossDomainAjax,
				async: true,
				cache: false
			})
			.done(function(data) {
				var h = NETDATA.chartRegistry.fixid(host);
				//console.log('downloaded all charts from ' + host + ' (' + h + ')');
				self.charts[h] = data.charts;
				if(typeof callback === 'function')
					callback(data);
			})
			.fail(function() {
				if(typeof callback === 'function')
					callback(null);
			});
		}
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Global Pan and Zoom on charts

	// Using this structure are synchronize all the charts, so that
	// when you pan or zoom one, all others are automatically refreshed
	// to the same timespan.

	NETDATA.globalPanAndZoom = {
		seq: 0,					// timestamp ms
								// every time a chart is panned or zoomed
								// we set the timestamp here
								// then we use it as a sequence number
								// to find if other charts are syncronized
								// to this timerange

		master: null,			// the master chart (state), to which all others
								// are synchronized

		force_before_ms: null,	// the timespan to sync all other charts 
		force_after_ms: null,

		// set a new master
		setMaster: function(state, after, before) {
			if(NETDATA.options.current.sync_pan_and_zoom === false)
				return;

			if(this.master !== null && this.master !== state)
				this.master.resetChart();

			var now = new Date().getTime();
			this.master = state;
			this.seq = now;
			this.force_after_ms = after;
			this.force_before_ms = before;
			NETDATA.options.auto_refresher_stop_until = now + NETDATA.options.current.global_pan_sync_time;
		},

		// clear the master
		clearMaster: function() {
			if(NETDATA.options.current.sync_pan_and_zoom === false)
				return;

			if(this.master !== null) {
				var state = this.master;
				this.master = null; // prevent infinite recursion
				this.seq = 0;
				state.resetChart();
				NETDATA.options.auto_refresher_stop_until = 0;
			}

			this.master = null;
			this.seq = 0;
			this.force_after_ms = null;
			this.force_before_ms = null;
		},

		// is the given state the master of the global
		// pan and zoom sync?
		isMaster: function(state) {
			if(this.master === state) return true;
			return false;
		},

		// are we currently have a global pan and zoom sync?
		isActive: function() {
			if(this.master !== null && this.force_before_ms !== null && this.force_after_ms !== null && this.seq !== 0) return true;
			return false;
		},

		// check if a chart, other than the master
		// needs to be refreshed, due to the global pan and zoom
		shouldBeAutoRefreshed: function(state) {
			if(this.master === null || this.seq === 0)
				return false;

			if(state.needsRecreation())
				return true;

			if(state.tm.pan_and_zoom_seq === this.seq)
				return false;

			return true;
		}
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Our state object, where all per-chart values are stored

	chartState = function(element) {
		var self = $(element);

		$.extend(this, {
			uuid: NETDATA.guid(),	// GUID - a unique identifier for the chart
			id: self.data('netdata'),	// string - the name of chart

			// the user given dimensions of the element
			width: self.data('width') || NETDATA.chartDefaults.width,
			height: self.data('height') || NETDATA.chartDefaults.height,

			// string - the netdata server URL, without any path
			host: self.data('host') || NETDATA.chartDefaults.host,

			// string - the grouping method requested by the user
			method: self.data('method') || NETDATA.chartDefaults.method,

			// the time-range requested by the user
			after: self.data('after') || NETDATA.chartDefaults.after,
			before: self.data('before') || NETDATA.chartDefaults.before,

			// the pixels per point requested by the user
			pixels_per_point: self.data('pixels-per-point') || 1,
			points: self.data('points') || null,

			// the dimensions requested by the user
			dimensions: self.data('dimensions') || null,

			// the chart library requested by the user
			library_name: self.data('chart-library') || NETDATA.chartDefaults.library,
			library: null,			// object - the chart library used

			colors: null,
			colors_assigned: {},
			colors_available: null,

			element: element,		// the element already created by the user
			element_message: null,
			element_loading: null,
			element_chart: null,	// the element with the chart
			element_chart_id: null,
			element_legend: null, 	// the element with the legend of the chart (if created by us)
			element_legend_id: null,
			element_legend_childs: {
				hidden: null,
				title_date: null,
				title_time: null,
				title_units: null,
				nano: null,
				nano_options: null,
				series: null
			},

			chart_url: null,		// string - the url to download chart info
			chart: null,			// object - the chart as downloaded from the server

			validated: false, 		// boolean - has the chart been validated?
			enabled: true, 			// boolean - is the chart enabled for refresh?
			paused: false,			// boolean - is the chart paused for any reason?
			selected: false,		// boolean - is the chart shown a selection?
			debug: false,			// boolean - console.log() debug info about this chart

			dom_created: false,		// boolean - is the DOM for the chart created?
			chart_created: false,	// boolean - is the library.create() been called?

			updates_counter: 0,		// numeric - the number of refreshes made so far
			updates_since_last_creation: 0,

			tm: {
				last_info_downloaded: 0,	// milliseconds - the timestamp we downloaded the chart

				last_updated: 0,			// the timestamp the chart last updated with data

				pan_and_zoom_seq: 0,		// the sequence number of the global synchronization
											// between chart.
											// Used with NETDATA.globalPanAndZoom.seq

				last_visible_check: 0,		// the time we last checked if it is visible

				last_resized: 0,			// the time the chart was resized
				last_hidden: 0,				// the time the chart was hidden
				last_unhidden: 0,			// the time the chart was unhidden

				last_autorefreshed: 0		// the time the chart was last refreshed
			},

			data: null,				// the last data as downloaded from the netdata server
			data_url: 'invalid://',	// string - the last url used to update the chart
			data_points: 0,			// number - the number of points returned from netdata
			data_after: 0,			// milliseconds - the first timestamp of the data
			data_before: 0,			// milliseconds - the last timestamp of the data
			data_update_every: 0,	// milliseconds - the frequency to update the data
			netdata_first: 0,		// milliseconds - the first timestamp in netdata
			netdata_last: 0,		// milliseconds - the last timestamp in netdata

			current: null, 			// auto, pan, zoom
									// this is a pointer to one of the sub-classes below

			auto: {
				name: 'auto',
				autorefresh: true,
				force_update_at: 0, // the timestamp to force the update at
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
			},
			pan: {
				name: 'pan',
				autorefresh: false,
				force_update_at: 0, // the timestamp to force the update at
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
			},
			zoom: {
				name: 'zoom',
				autorefresh: false,
				force_update_at: 0, // the timestamp to force the update at
				force_before_ms: null,
				force_after_ms: null,
				requested_before_ms: null,
				requested_after_ms: null,
			},

			refresh_dt_ms: 0,		// milliseconds - the time the last refresh took
			refresh_dt_element_name: self.data('dt-element-name') || null,	// string - the element to print refresh_dt_ms
			refresh_dt_element: null
		});

		this.init();
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Chart Resize

	chartState.prototype.resizeHandler = function(e) {
		e.preventDefault();

		if(typeof this.event_resize === 'undefined'
			|| this.event_resize.chart_original_w === 'undefined'
			|| this.event_resize.chart_original_h === 'undefined')
			this.event_resize = {
				chart_original_w: this.element.clientWidth,
				chart_original_h: this.element.clientHeight,
				last: 0
			};

		if(e.type === 'touchstart') {
			this.event_resize.mouse_start_x = e.touches.item(0).pageX;
			this.event_resize.mouse_start_y = e.touches.item(0).pageY;
		}
		else {
			this.event_resize.mouse_start_x = e.clientX;
			this.event_resize.mouse_start_y = e.clientY;
		}

		this.event_resize.chart_start_w = this.element.clientWidth;
		this.event_resize.chart_start_h = this.element.clientHeight;
		this.event_resize.chart_last_w = this.element.clientWidth;
		this.event_resize.chart_last_h = this.element.clientHeight;

		// this is actual chart resize algorithm
		// it will:
		// - resize the entire container
		// - update the internal states
		// - resize the chart as the div changes height
		// - update the scrollbar of the legend
		var resize_height_and_update_chart = function(state, h) {
			state.element.style.height = h.toString() + 'px';

			var now = new Date().getTime();
			NETDATA.options.last_page_scroll = now;
			NETDATA.options.last_resized = now;
			NETDATA.options.auto_refresher_stop_until = now + NETDATA.options.current.stop_updates_while_resizing;

			if(typeof state.library.resize === 'function')
				state.library.resize(state);

			if(state.element_legend_childs.nano !== null && state.element_legend_childs.nano_options !== null)
				$(state.element_legend_childs.nano).nanoScroller();
		};

		var now = new Date().getTime();
		if(now - this.event_resize.last <= NETDATA.options.current.double_click_speed) {
			// double click / double tap event

			// the optimal height of the chart
			// showing the entire legend
			var optimal = this.event_resize.chart_last_h
					+ this.element_legend_childs.content.scrollHeight
					- this.element_legend_childs.content.clientHeight;

			// if we are not optimal, be optimal
			if(this.event_resize.chart_last_h != optimal)
				resize_height_and_update_chart(this, optimal);

			// else if we do not have the original height
			// reset to the original height
			else if(this.event_resize.chart_last_h != this.event_resize.chart_original_h)
				resize_height_and_update_chart(this, this.event_resize.chart_original_h);
		}
		else {
			this.event_resize.last = now;
			var self = this;

			// process movement event
			document.onmousemove =
			document.ontouchmove =
			this.element_legend_childs.resize_handler.onmousemove =
			this.element_legend_childs.resize_handler.ontouchmove =
				function(e) {
					var y = null;

					switch(e.type) {
						case 'mousemove': y = e.clientY; break;
						case 'touchmove': y = e.touches.item(e.touches - 1).pageY; break;
					}

					if(y !== null) {
						var	newH = self.event_resize.chart_start_h + y - self.event_resize.mouse_start_y;

						if(newH >= 70 && newH !== self.event_resize.chart_last_h) {
							resize_height_and_update_chart(self, newH);
							self.event_resize.chart_last_h = newH;
						}
					}
				};

			// process end event
			document.onmouseup = 
			document.ontouchend = 
			this.element_legend_childs.resize_handler.onmouseup =
			this.element_legend_childs.resize_handler.ontouchend =
				function(e) {
					// remove all the hooks
					document.onmouseup =
					document.onmousemove =
					document.ontouchmove =
					document.ontouchend =
					self.element_legend_childs.resize_handler.onmousemove =
					self.element_legend_childs.resize_handler.ontouchmove =
					self.element_legend_childs.resize_handler.onmouseout =
					self.element_legend_childs.resize_handler.onmouseup =
					self.element_legend_childs.resize_handler.ontouchend =
						null;

					// allow auto-refreshes
					NETDATA.options.auto_refresher_stop_until = 0;
				};
		}
	}

	
	// ----------------------------------------------------------------------------------------------------------------
	// global selection sync

	NETDATA.globalSelectionSync = {
		state: null,
		dont_sync_before: 0,
		slaves: []
	};

	// prevent to global selection sync for some time
	chartState.prototype.globalSelectionSyncDelay = function(ms) {
		if(NETDATA.options.current.sync_selection === false)
			return;

		if(typeof ms === 'number')
			NETDATA.globalSelectionSync.dont_sync_before = new Date().getTime() + ms;
		else
			NETDATA.globalSelectionSync.dont_sync_before = new Date().getTime() + NETDATA.options.current.sync_selection_delay;
	}

	// can we globally apply selection sync?
	chartState.prototype.globalSelectionSyncAbility = function() {
		if(NETDATA.options.current.sync_selection === false)
			return false;

		if(NETDATA.globalSelectionSync.dont_sync_before > new Date().getTime()) return false;
		return true;
	}

	chartState.prototype.globalSelectionSyncIsMaster = function() {
		if(NETDATA.globalSelectionSync.state === this)
			return true;
		else
			return false;
	}

	// this chart is the master of the global selection sync
	chartState.prototype.globalSelectionSyncBeMaster = function() {
		// am I the master?
		if(this.globalSelectionSyncIsMaster()) {
			if(this.debug === true)
				this.log('sync: I am the master already.');

			return;
		}

		if(NETDATA.globalSelectionSync.state) {
			if(this.debug === true)
				this.log('sync: I am not the sync master. Resetting global sync.');

			this.globalSelectionSyncStop();
		}

		// become the master
		if(this.debug === true)
			this.log('sync: becoming sync master.');

		this.selected = true;
		NETDATA.globalSelectionSync.state = this;

		// find the all slaves
		var targets = NETDATA.options.targets;
		var len = targets.length;
		while(len--) {
			st = targets[len];

			if(st === this) {
				if(this.debug === true)
					st.log('sync: not adding me to sync');
			}
			else if(st.globalSelectionSyncIsEligible()) {
				if(this.debug === true)
					st.log('sync: adding to sync as slave');

				st.globalSelectionSyncBeSlave();
			}
		}

		// this.globalSelectionSyncDelay(100);
	}

	// can the chart participate to the global selection sync as a slave?
	chartState.prototype.globalSelectionSyncIsEligible = function() {
		if(this.enabled === true
			&& this.library !== null
			&& typeof this.library.setSelection === 'function'
			&& this.isVisible()
			&& this.dom_created === true
			&& this.chart_created === true)
			return true;

		return false;
	}

	// this chart is a slave of the global selection sync
	chartState.prototype.globalSelectionSyncBeSlave = function() {
		if(NETDATA.globalSelectionSync.state !== this)
			NETDATA.globalSelectionSync.slaves.push(this);
	}

	// sync all the visible charts to the given time
	// this is to be called from the chart libraries
	chartState.prototype.globalSelectionSync = function(t) {
		if(this.globalSelectionSyncAbility() === false) {
			if(this.debug === true)
				this.log('sync: cannot sync (yet?).');

			return;
		}

		if(this.globalSelectionSyncIsMaster() === false) {
			if(this.debug === true)
				this.log('sync: trying to be sync master.');

			this.globalSelectionSyncBeMaster();

			if(this.globalSelectionSyncAbility() === false) {
				if(this.debug === true)
					this.log('sync: cannot sync (yet?).');

				return;
			}
		}

		$.each(NETDATA.globalSelectionSync.slaves, function(i, st) {
			st.setSelection(t);
		});
	}

	// stop syncing all charts to the given time
	chartState.prototype.globalSelectionSyncStop = function() {
		if(NETDATA.globalSelectionSync.slaves.length) {
			if(this.debug === true)
				this.log('sync: cleaning up...');

			var self = this;
			$.each(NETDATA.globalSelectionSync.slaves, function(i, st) {
				if(st === self) {
					if(self.debug === true)
						st.log('sync: not adding me to sync stop');
				}
				else {
					if(self.debug === true)
						st.log('sync: removed slave from sync');

					st.clearSelection();
				}
			});

			NETDATA.globalSelectionSync.slaves = [];
			NETDATA.globalSelectionSync.state = null;
		}

		// since we are the sync master, we should not call this.clearSelection()
		// dygraphs is taking care of visualizing our selection.
		this.selected = false;
	}

	chartState.prototype.setSelection = function(t) {
		if(typeof this.library.setSelection === 'function') {
			if(this.library.setSelection(this, t) === true)
				this.selected = true;
			else
				this.selected = false;
		}
		else this.selected = true;

		if(this.selected === true && this.debug === true)
			this.log('selection set to ' + t.toString());

		return this.selected;
	}

	chartState.prototype.clearSelection = function() {
		if(this.selected === true) {
			if(typeof this.library.clearSelection === 'function') {
				if(this.library.clearSelection(this) === true)
					this.selected = false;
				else
					this.selected = true;
			}
			else this.selected = false;
			
			if(this.selected === false && this.debug === true)
				this.log('selection cleared');
		}

		this.legendReset();
		return this.selected;
	}

	// find if a timestamp (ms) is shown in the current chart
	chartState.prototype.timeIsVisible = function(t) {
		if(t >= this.data_after && t <= this.data_before)
			return true;
		return false;
	},

	chartState.prototype.calculateRowForTime = function(t) {
		if(this.timeIsVisible(t) === false) return -1;
		return Math.floor((t - this.data_after) / this.data_update_every);
	}

	// ----------------------------------------------------------------------------------------------------------------

	// console logging
	chartState.prototype.log = function(msg) {
		console.log(this.id + ' (' + this.library_name + ' ' + this.uuid + '): ' + msg);
	}

	chartState.prototype.pauseChart = function() {
		if(this.paused === false) {
			if(this.debug === true)
				this.log('paused');

			this.paused = true;
		}
	}

	chartState.prototype.unpauseChart = function() {
		if(this.paused) {
			if(this.debug === true)
				this.log('unpaused');

			this.paused = false;
		}
	}

	chartState.prototype.resetChart = function() {
		if(NETDATA.globalPanAndZoom.isMaster(this) && this.isVisible())
			NETDATA.globalPanAndZoom.clearMaster();

		this.tm.pan_and_zoom_seq = 0;

		this.clearSelection();

		this.setMode('auto');
		this.current.force_update_at = 0;
		this.current.force_before_ms = null;
		this.current.force_after_ms = null;
		this.tm.last_autorefreshed = 0;
		this.paused = false;
		this.selected = false;
		this.enabled = true;
		this.debug = false;

		// do not update the chart here
		// or the chart will flip-flop when it is the master
		// of a selection sync and another chart becomes
		// the new master
		if(NETDATA.options.current.sync_pan_and_zoom === false && this.isVisible() === true)
			this.updateChart();
	}

	chartState.prototype.setMode = function(m) {
		if(this.current) {
			if(this.current.name === m) return;

			this[m].requested_before_ms = this.current.requested_before_ms;
			this[m].requested_after_ms = this.current.requested_after_ms;
		}

		if(m === 'auto')
			this.current = this.auto;
		else if(m === 'pan')
			this.current = this.pan;
		else if(m === 'zoom')
			this.current = this.zoom;
		else
			this.current = this.auto;

		this.current.force_update_at = 0;
		this.current.force_before_ms = null;
		this.current.force_after_ms = null;

		if(this.debug === true)
			this.log('mode set to ' + this.current.name);
	}

	chartState.prototype.updateChartPanOrZoom = function(after, before) {
		if(before < after) return false;

		var min_duration = Math.round((this.chartWidth() / 30 * this.chart.update_every * 1000));

		if(this.debug === true)
			this.log('requested duration of ' + ((before - after) / 1000).toString() + ' (' + after + ' - ' + before + '), minimum ' + min_duration / 1000);

		if((before - after) < min_duration) return false;

		var current_duration = this.data_before - this.data_after;
		var wanted_duration = before - after;
		var tolerance = this.data_update_every * 2;
		var movement = Math.abs(before - this.data_before);

		if(this.debug === true)
			this.log('current duration: ' + current_duration / 1000 + ', wanted duration: ' + wanted_duration / 1000 + ', movement: ' + movement / 1000 + ', tolerance: ' + tolerance / 1000);

		if(Math.abs(current_duration - wanted_duration) <= tolerance && movement <= tolerance) {
			if(this.debug === true)
				this.log('IGNORED');

			return false;
		}

		if(this.current.name === 'auto') {
			this.setMode('pan');

			if(this.debug === true)
				this.log('updateChartPanOrZoom(): caller did not set proper mode');
		}

		this.current.force_update_at = new Date().getTime() + NETDATA.options.current.pan_and_zoom_delay;
		this.current.force_after_ms = after;
		this.current.force_before_ms = before;
		NETDATA.globalPanAndZoom.setMaster(this, after, before);
		return true;
	}

	chartState.prototype.legendFormatValue = function(value) {
		if(value === null || value === 'undefined') return '-';
		if(typeof value !== 'number') return value;

		var abs = Math.abs(value);
		if(abs >= 1) return (Math.round(value * 100) / 100).toLocaleString();
		if(abs >= 0.1) return (Math.round(value * 1000) / 1000).toLocaleString();
		return (Math.round(value * 10000) / 10000).toLocaleString();
	}

	chartState.prototype.legendSetLabelValue = function(label, value) {
		var series = this.element_legend_childs.series[label];
		if(typeof series === 'undefined') return;
		if(series.value === null && series.user === null) return;

		value = this.legendFormatValue(value);

		// if the value has not changed, skip DOM update
		if(series.last === value) return;
		series.last = value;

		if(series.value !== null) series.value.innerHTML = value;
		if(series.user !== null) series.user.innerHTML = value;
	}

	chartState.prototype.legendSetDate = function(ms) {
		if(typeof ms !== 'number') {
			this.legendShowUndefined();
			return;
		}

		var d = new Date(ms);

		if(this.element_legend_childs.title_date)
			this.element_legend_childs.title_date.innerHTML = d.toLocaleDateString();

		if(this.element_legend_childs.title_time)
			this.element_legend_childs.title_time.innerHTML = d.toLocaleTimeString();

		if(this.element_legend_childs.title_units)
			this.element_legend_childs.title_units.innerHTML = this.chart.units;
	}

	chartState.prototype.legendShowUndefined = function() {
		if(this.element_legend_childs.title_date)
			this.element_legend_childs.title_date.innerHTML = '&nbsp;';

		if(this.element_legend_childs.title_time)
			this.element_legend_childs.title_time.innerHTML = this.chart.name;

		if(this.element_legend_childs.title_units)
			this.element_legend_childs.title_units.innerHTML = '&nbsp;';

		if(this.data && this.element_legend_childs.series !== null) {
			var labels = this.data.dimension_names;
			var i = labels.length;
			while(i--) {
				var label = labels[i];

				if(typeof label === 'undefined') continue;
				if(typeof this.element_legend_childs.series[label] === 'undefined') continue;
				this.legendSetLabelValue(label, null);
			}
		}
	}

	chartState.prototype.legendShowLatestValues = function() {
		if(this.chart === null) return;
		if(this.selected) return;

		if(this.data === null || this.element_legend_childs.series === null) {
			this.legendShowUndefined();
			return;
		}

		var show_undefined = true;
		if(Math.abs(this.data.last_entry - this.data.before) <= this.data.view_update_every)
			show_undefined = false;

		if(show_undefined)
			this.legendShowUndefined();
		else
			this.legendSetDate(this.data.before * 1000);

		var labels = this.data.dimension_names;
		var i = labels.length;
		while(i--) {
			var label = labels[i];

			if(typeof label === 'undefined') continue;
			if(typeof this.element_legend_childs.series[label] === 'undefined') continue;

			if(show_undefined)
				this.legendSetLabelValue(label, null);
			else
				this.legendSetLabelValue(label, this.data.view_latest_values[i]);
		}
	}

	chartState.prototype.legendReset = function() {
		this.legendShowLatestValues();
	}

	// this should be called just ONCE per dimension per chart
	chartState.prototype._chartDimensionColor = function(label) {
		if(this.colors === null) this.chartColors();

		if(typeof this.colors_assigned[label] === 'undefined') {
			if(this.colors_available.length === 0) {
				for(var i = 0, len = NETDATA.colors.length; i < len ; i++)
					this.colors_available.push(NETDATA.colors[i]);
			}

			this.colors_assigned[label] = this.colors_available.shift();

			if(this.debug === true)
				this.log('label "' + label + '" got color "' + this.colors_assigned[label]);
		}
		else {
			if(this.debug === true)
				this.log('label "' + label + '" already has color "' + this.colors_assigned[label] + '"');
		}

		this.colors.push(this.colors_assigned[label]);
		return this.colors_assigned[label];
	}

	chartState.prototype.chartColors = function() {
		if(this.colors !== null) return this.colors;

		this.colors = new Array();
		this.colors_available = new Array();
		// this.colors_assigned = {};

		var c = $(this.element).data('colors');
		if(typeof c !== 'undefined' && c !== null) {
			if(typeof c !== 'string') {
				this.log('invalid color given: ' + c + ' (give a space separated list of colors)');
			}
			else {
				c = c.split(' ');
				for(var i = 0, len = c.length; i < len ; i++)
					this.colors_available.push(c[i]);
			}
		}

		// push all the standard colors too
		for(var i = 0, len = NETDATA.colors.length; i < len ; i++)
			this.colors_available.push(NETDATA.colors[i]);

		return this.colors;
	}

	chartState.prototype.legendUpdateDOM = function() {
		var needed = false;

		// check that the legend DOM is up to date for the downloaded dimensions
		if(typeof this.element_legend_childs.series !== 'object' || this.element_legend_childs.series === null) {
			// this.log('the legend does not have any series - requesting legend update');
			needed = true;
		}
		else if(this.data === null) {
			// this.log('the chart does not have any data - requesting legend update');
			needed = true;
		}
		else if(typeof this.element_legend_childs.series.labels_key === 'undefined') {
			needed = true;
		}
		else {
			var labels = this.data.dimension_names.toString();
			if(labels !== this.element_legend_childs.series.labels_key) {
				needed = true;

				if(this.debug === true)
					this.log('NEW LABELS: "' + labels + '" NOT EQUAL OLD LABELS: "' + this.element_legend_childs.series.labels_key + '"');
			}
		}

		if(needed === false) {
			// make sure colors available
			this.chartColors();

			// do we have to update the current values?
			// we do this, only when the visible chart is current
			if(Math.abs(this.data.last_entry - this.data.before) <= this.data.view_update_every) {
				if(this.debug === true)
					this.log('chart in running... updating values on legend...');

				var labels = this.data.dimension_names;
				var i = labels.length;
				while(i--)
					this.legendSetLabelValue(labels[i], this.data.latest_values[i]);
			}
			return;
		}
		if(this.colors === null) {
			// this is the first time we update the chart
			// let's assign colors to all dimensions
			if(this.library.track_colors() === true)
				for(var dim in this.chart.dimensions)
					this._chartDimensionColor(this.chart.dimensions[dim].name);
		}
		// we will re-generate the colors for the chart
		this.colors = null;

		if(this.debug === true)
			this.log('updating Legend DOM');

		var self = $(this.element);
		var genLabel = function(state, parent, name, count) {
			var color = state._chartDimensionColor(name);

			var user_element = null;
			var user_id = self.data('show-value-of-' + name + '-at') || null;
			if(user_id !== null) {
				user_element = document.getElementById(user_id) || null;
				if(user_element === null)
					me.log('Cannot find element with id: ' + user_id);
			}

			state.element_legend_childs.series[name] = {
				name: document.createElement('span'),
				value: document.createElement('span'),
				user: user_element,
				last: null
			};

			var label = state.element_legend_childs.series[name];

			label.name.className += ' netdata-legend-name';
			label.value.className += ' netdata-legend-value';
			label.name.title = name;
			label.value.title = name;

			var rgb = NETDATA.colorHex2Rgb(color);
			label.name.innerHTML = '<table class="netdata-legend-name-table-'
				+ state.chart.chart_type
				+ '" style="background-color: '
				+ 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + NETDATA.options.current['color_fill_opacity_' + state.chart.chart_type] + ')'
				+ '"><tr class="netdata-legend-name-tr"><td class="netdata-legend-name-td"></td></tr></table>'

			var text = document.createTextNode(' ' + name);
			label.name.appendChild(text);

			label.name.style.color = color;
			label.value.style.color = color;

			if(count > 0)
				parent.appendChild(document.createElement('br'));

			parent.appendChild(label.name);
			parent.appendChild(label.value);
		};

		var content = document.createElement('div');

		if(this.hasLegend()) {
			this.element_legend_childs = {
				content: content,
				resize_handler: document.createElement('div'),
				title_date: document.createElement('span'),
				title_time: document.createElement('span'),
				title_units: document.createElement('span'),
				nano: document.createElement('div'),
				nano_options: {
					paneClass: 'netdata-legend-series-pane',
					sliderClass: 'netdata-legend-series-slider',
					contentClass: 'netdata-legend-series-content',
					enabledClass: '__enabled',
					flashedClass: '__flashed',
					activeClass: '__active',
					tabIndex: -1,
					alwaysVisible: true
				},
				series: {}
			};

			this.element_legend.innerHTML = '';

			this.element_legend_childs.resize_handler.className += " netdata-legend-resize-handler";
			this.element_legend_childs.resize_handler.innerHTML = '<i class="fa fa-chevron-up"></i><i class="fa fa-chevron-down"></i>';
			this.element.appendChild(this.element_legend_childs.resize_handler);
			var self2 = this;

			// mousedown event
			this.element_legend_childs.resize_handler.onmousedown =
				function(e) {
					self2.resizeHandler(e);
				};

			// touchstart event
			this.element_legend_childs.resize_handler.addEventListener('touchstart', function(e) {
				self2.resizeHandler(e);
			}, false);

			this.element_legend_childs.title_date.className += " netdata-legend-title-date";
			this.element_legend.appendChild(this.element_legend_childs.title_date);

			this.element_legend.appendChild(document.createElement('br'));

			this.element_legend_childs.title_time.className += " netdata-legend-title-time";
			this.element_legend.appendChild(this.element_legend_childs.title_time);

			this.element_legend.appendChild(document.createElement('br'));

			this.element_legend_childs.title_units.className += " netdata-legend-title-units";
			this.element_legend.appendChild(this.element_legend_childs.title_units);

			this.element_legend.appendChild(document.createElement('br'));

			this.element_legend_childs.nano.className = 'netdata-legend-series';
			this.element_legend.appendChild(this.element_legend_childs.nano);

			content.className = 'netdata-legend-series-content';
			this.element_legend_childs.nano.appendChild(content);
		}
		else {
			this.element_legend_childs = {
				content: content,
				resize_handler: null,
				title_date: null,
				title_time: null,
				title_units: null,
				nano: null,
				nano_options: null,
				series: {}
			};
		}

		if(this.data) {
			this.element_legend_childs.series.labels_key = this.data.dimension_names.toString();
			if(this.debug === true)
				this.log('labels from data: "' + this.element_legend_childs.series.labels_key + '"');

			for(var i = 0, len = this.data.dimension_names.length; i < len ;i++) {
				genLabel(this, content, this.data.dimension_names[i], i);
			}
		}
		else {
			var tmp = new Array();
			for(var dim in this.chart.dimensions) {
				tmp.push(this.chart.dimensions[dim].name);
				genLabel(this, content, this.chart.dimensions[dim].name, i);
			}
			this.element_legend_childs.series.labels_key = tmp.toString();
			if(this.debug === true)
				this.log('labels from chart: "' + this.element_legend_childs.series.labels_key + '"');
		}

		// create a hidden div to be used for hidding
		// the original legend of the chart library
		var el = document.createElement('div');
		this.element_legend.appendChild(el);
		el.style.display = 'none';

		this.element_legend_childs.hidden = document.createElement('div');
		el.appendChild(this.element_legend_childs.hidden);

		if(this.element_legend_childs.nano !== null && this.element_legend_childs.nano_options !== null)
			$(this.element_legend_childs.nano).nanoScroller(this.element_legend_childs.nano_options);

		this.legendShowLatestValues();
	}

	chartState.prototype.createChartDOM = function() {
		if(this.debug === true)
			this.log('creating DOM');

		this.element_chart_id = this.library_name + '-' + this.uuid + '-chart';
		this.element_chart = document.createElement('div');
		this.element_chart.className += ' netdata-chart' + (this.hasLegend()?'-with-legend-right':'').toString();
		this.element_chart.className += ' netdata-' + this.library_name + '-chart' + (this.hasLegend()?'-with-legend-right':'').toString();
		this.element_chart.id = this.element_chart_id;
		$(this.element_chart).data('netdata-state-object', this);
		this.element.appendChild(this.element_chart);

		this.element_legend_id = this.library_name + '-' + this.uuid + '-legend';
		this.element_legend = document.createElement('div');
		this.element_legend.className += ' netdata-chart-legend';
		this.element_legend.className += ' netdata-' + this.library_name + '-legend';
		this.element_legend.id = this.element_legend_id;
		$(this.element_legend).data('netdata-state-object', this);
		
		if(this.hasLegend() === false)
			this.element_legend.style.display = 'none';
		else
			this.element.appendChild(this.element_legend);

		this.element_legend_childs.series = null;
		this.legendUpdateDOM();

		// in case the user has an active global selection sync in place
		// reset it
		this.globalSelectionSyncStop();
		this.dom_created = true;
	}

	chartState.prototype.hasLegend = function() {
		if(typeof this.___hasLegendCache___ !== 'undefined')
			return this.___hasLegendCache___;

		var leg = false;
		if(this.library && this.library.legend(this) === 'right-side') {
			var legend = $(this.element).data('legend') || 'yes';
			if(legend === 'yes') leg = true;
		}

		this.___hasLegendCache___ = leg;
		return leg;
	}

	chartState.prototype.legendWidth = function() {
		return (this.hasLegend())?110:0;
	}

	chartState.prototype.legendHeight = function() {
		return $(this.element).height();
	}

	chartState.prototype.chartWidth = function() {
		return $(this.element).width() - this.legendWidth();
	}

	chartState.prototype.chartHeight = function() {
		return $(this.element).height();
	}

	chartState.prototype.chartPixelsPerPoint = function() {
		// force an options provided detail
		var px = this.pixels_per_point;

		if(this.library && px < this.library.pixels_per_point(this))
			px = this.library.pixels_per_point(this);

		if(px < NETDATA.options.current.pixels_per_point)
			px = NETDATA.options.current.pixels_per_point;

		return px;
	}

	chartState.prototype.needsRecreation = function() {
		return (
				this.dom_created === true
				&& this.chart_created === true
				&& this.library
				&& this.library.autoresize() === false
				&& this.tm.last_resized < NETDATA.options.last_resized
			);
	}

	chartState.prototype.resizeChart = function() {
		if(this.needsRecreation()) {
			if(this.debug === true)
				this.log('forcing re-generation due to window resize.');

			this.destroyChart();
		}

		this.tm.last_resized = new Date().getTime();
	}

	chartState.prototype.chartURL = function() {
		var before;
		var after;
		if(NETDATA.globalPanAndZoom.isActive()) {
			after = Math.round(NETDATA.globalPanAndZoom.force_after_ms / 1000);
			before = Math.round(NETDATA.globalPanAndZoom.force_before_ms / 1000);
			this.tm.pan_and_zoom_seq = NETDATA.globalPanAndZoom.seq;
		}
		else {
			before = this.current.force_before_ms !== null ? Math.round(this.current.force_before_ms / 1000) : this.before;
			after  = this.current.force_after_ms  !== null ? Math.round(this.current.force_after_ms / 1000) : this.after;
			this.tm.pan_and_zoom_seq = 0;
		}

		this.current.requested_after_ms = after * 1000;
		this.current.requested_before_ms = before * 1000;

		this.data_points = this.points || Math.round(this.chartWidth() / this.chartPixelsPerPoint());

		// build the data URL
		this.data_url = this.chart.data_url;
		this.data_url += "&format="  + this.library.format();
		this.data_url += "&points="  + this.data_points.toString();
		this.data_url += "&group="   + this.method;
		this.data_url += "&options=" + this.library.options();
		this.data_url += '|jsonwrap';

		if(NETDATA.options.current.eliminate_zero_dimensions === true)
			this.data_url += '|nonzero';

		if(after)
			this.data_url += "&after="  + after.toString();

		if(before)
			this.data_url += "&before=" + before.toString();

		if(this.dimensions)
			this.data_url += "&dimensions=" + this.dimensions;

		if(NETDATA.options.debug.chart_data_url === true || this.debug === true)
			this.log('chartURL(): ' + this.data_url + ' WxH:' + this.chartWidth() + 'x' + this.chartHeight() + ' points: ' + this.data_points + ' library: ' + this.library_name);
	}

	chartState.prototype.updateChartWithData = function(data) {
		if(this.debug === true)
			this.log('got data from netdata server');

		this.data = data;
		this.updates_counter++;

		var started = new Date().getTime();
		this.tm.last_updated = started;

		// if the result is JSON, find the latest update-every
		if(typeof data === 'object') {
			if(typeof data.view_update_every !== 'undefined')
				this.data_update_every = data.view_update_every * 1000;

			if(typeof data.after !== 'undefined')
				this.data_after = data.after * 1000;

			if(typeof data.before !== 'undefined')
				this.data_before = data.before * 1000;

			if(typeof data.first_entry !== 'undefined')
				this.netdata_first = data.first_entry * 1000;

			if(typeof data.last_entry !== 'undefined')
				this.netdata_last = data.last_entry * 1000;

			if(typeof data.points !== 'undefined')
				this.data_points = data.points;

			data.state = this;
		}

		if(this.debug === true) {
			this.log('UPDATE No ' + this.updates_counter + ' COMPLETED');

			if(this.current.force_after_ms)
				this.log('STATUS: forced   : ' + (this.current.force_after_ms / 1000).toString() + ' - ' + (this.current.force_before_ms / 1000).toString());
			else
				this.log('STATUS: forced: unset');

			this.log('STATUS: requested: ' + (this.current.requested_after_ms / 1000).toString() + ' - ' + (this.current.requested_before_ms / 1000).toString());
			this.log('STATUS: rendered : ' + (this.data_after / 1000).toString() + ' - ' + (this.data_before / 1000).toString());
			this.log('STATUS: points   : ' + (this.data_points).toString());
		}

		if(this.data_points === 0) {
			this.noData();
			return;
		}

		// this may force the chart to be re-created
		this.resizeChart();

		if(this.updates_since_last_creation >= this.library.max_updates_to_recreate()) {
			if(this.debug === true)
				this.log('max updates of ' + this.updates_since_last_creation.toString() + ' reached. Forcing re-generation.');

			this.chart_created = false;
		}

		if(this.chart_created === true
			&& this.dom_created === true
			&& typeof this.library.update === 'function') {

			if(this.debug === true)
				this.log('updating chart...');

			// check and update the legend
			this.legendUpdateDOM();

			this.updates_since_last_creation++;
			if(NETDATA.options.debug.chart_errors === true) {
				this.library.update(this, data);
			}
			else {
				try {
					this.library.update(this, data);
				}
				catch(err) {
					this.error('chart failed to be updated as ' + this.library_name);
				}
			}
		}
		else {
			if(this.debug === true)
				this.log('creating chart...');

			this.createChartDOM();
			this.updates_since_last_creation = 0;

			if(NETDATA.options.debug.chart_errors === true) {
				this.library.create(this, data);
				this.chart_created = true;
			}
			else {
				try {
					this.library.create(this, data);
					this.chart_created = true;
				}
				catch(err) {
					this.error('chart failed to be created as ' + this.library_name);
				}
			}
		}
		this.legendShowLatestValues();

		// update the performance counters
		var now = new Date().getTime();

		// don't update last_autorefreshed if this chart is
		// forced to be updated with global PanAndZoom
		if(NETDATA.globalPanAndZoom.isActive())
			this.tm.last_autorefreshed = 0;
		else {
			if(NETDATA.options.current.parallel_refresher === true && NETDATA.options.current.concurrent_refreshes)
				this.tm.last_autorefreshed = Math.round(now / this.data_update_every) * this.data_update_every;
			else
				this.tm.last_autorefreshed = now;
		}

		this.refresh_dt_ms = now - started;
		NETDATA.options.auto_refresher_fast_weight += this.refresh_dt_ms;

		if(this.refresh_dt_element)
			this.refresh_dt_element.innerHTML = this.refresh_dt_ms.toString();
	}

	chartState.prototype.updateChart = function(callback) {
		// due to late initialization of charts and libraries
		// we need to check this too
		if(this.enabled === false) {
			if(this.debug === true)
				this.log('I am not enabled');

			if(typeof callback === 'function') callback();
			return false;
		}

		if(this.chart === null) {
			var self = this;
			this.getChart(function() { self.updateChart(callback); });
			return;
		}

		if(this.library.initialized === false) {
			if(this.library.enabled === true) {
				var self = this;
				this.library.initialize(function() { self.updateChart(callback); });
				return;
			}
			else {
				this.error('chart library "' + this.library_name + '" is not available.');
				if(typeof callback === 'function') callback();
				return false;
			}
		}

		this.clearSelection();
		this.chartURL();
		this.showLoading();

		if(this.debug === true)
			this.log('updating from ' + this.data_url);

		var self = this;
		this.xhr = $.ajax( {
			url: this.data_url,
			crossDomain: NETDATA.options.crossDomainAjax,
			cache: false,
			async: true
		})
		.success(function(data) {
			self.hideLoading();

			if(self.debug === true)
				self.log('data received. updating chart.');

			self.updateChartWithData(data);
		})
		.fail(function() {
			self.hideLoading();
			self.error('data download failed for url: ' + self.data_url);
		})
		.always(function() {
			self.hideLoading();
			if(typeof callback === 'function') callback();
		});
	}

	chartState.prototype.destroyChart = function() {
		if(this.debug === true)
			this.log('destroying chart');

		if(this.element_message !== null) {
			this.element_message.innerHTML = '';
			this.element_message = null;
		}

		if(this.element_loading !== null) {
			this.element_loading.innerHTML = '';
			this.element_loading = null;
		}

		if(this.element_legend !== null) {
			this.element_legend.innerHTML = '';
			this.element_legend = null;
		}

		if(this.element_chart !== null) {
			this.element_chart.innerHTML = '';
			this.element_chart = null;
		}

		this.element_legend_childs = {
			hidden: null,
			title_date: null,
			title_time: null,
			title_units: null,
			nano: null,
			nano_options: null,
			series: null
		};

		this.element.innerHTML = '';
		this.refresh_dt_element = null;

		this.dom_created = false;
		this.chart_created = false;
		this.paused = false;
		this.selected = false;
		this.updates_counter = 0;
		this.updates_since_last_creation = 0;
		this.tm.pan_and_zoom_seq = 0;
		this.tm.last_resized = 0;
		this.tm.last_visible_check = 0;
		this.tm.last_hidden = 0;
		this.tm.last_unhidden = 0;
		this.tm.last_autorefreshed = 0;

		this.data = null;
		this.data_points = 0;
		this.data_after = 0;
		this.data_before = 0;
		this.data_update_every = 0;
		this.netdata_first = 0;
		this.netdata_last = 0;
		if(this.current !== null) {
			this.current.force_update_at = 0;
			this.current.force_after_ms = null;
			this.current.force_before_ms = null;
			this.current.requested_after_ms = null;
			this.current.requested_before_ms = null;
		}
		this.init();
	}

	chartState.prototype.unhideChart = function() {
		if(typeof this.___isHidden___ !== 'undefined' && this.enabled === true) {
			if(this.debug === true)
				this.log('unhiding chart');

			this.element_message.style.display = 'none';
			if(this.element_chart !== null) this.element_chart.style.display = 'inline-block';
			if(this.element_legend !== null) this.element_legend.style.display = 'inline-block';
			if(this.element_loading !== null) this.element_loading.style.display = 'none';
			this.___isHidden___ = undefined;
			this.element_message.innerHTML = 'chart ' + this.id + ' is visible now';

			// refresh the scrolbar
			if(this.element_legend_childs.nano !== null && this.element_legend_childs.nano_options !== null)
				$(this.element_legend_childs.nano).nanoScroller(this.element_legend_childs.nano_options);

			this.tm.last_unhidden = new Date().getTime();
		}
	}

	chartState.prototype.hideChart = function() {
		if(typeof this.___isHidden___ === 'undefined' && this.enabled === true) {
			if(NETDATA.options.current.destroy_on_hide === true)
				this.destroyChart();

			if(this.debug === true)
				this.log('hiding chart');

			this.element_message.style.display = 'inline-block';
			if(this.element_chart !== null) this.element_chart.style.display = 'none';
			if(this.element_legend !== null) this.element_legend.style.display = 'none';
			if(this.element_loading !== null) this.element_loading.style.display = 'none';
			this.___isHidden___ = true;
			this.___showsLoading___ = undefined;
			this.element_message.innerHTML = 'chart ' + this.id + ' is hidden to speed up the browser';
			this.tm.last_hidden = new Date().getTime();
		}
	}

	chartState.prototype.hideLoading = function() {
		if(typeof this.___showsLoading___ !== 'undefined' && this.enabled === true) {
			if(this.debug === true)
				this.log('hide loading...');

			this.element_message.style.display = 'none';
			if(this.element_chart !== null) this.element_chart.style.display = 'inline-block';
			if(this.element_legend !== null) this.element_legend.style.display = 'inline-block';
			if(this.element_loading !== null) this.element_loading.style.display = 'none';
			this.___showsLoading___ = undefined;
			this.element_loading.innerHTML = 'chart ' + this.id + ' finished loading!';
			this.tm.last_unhidden = new Date().getTime();
		}
	}

	chartState.prototype.showLoading = function() {
		if(typeof this.___showsLoading___ === 'undefined' && this.chart_created === false && this.enabled === true) {
			if(this.debug === true)
				this.log('show loading...');

			this.element_message.style.display = 'none';
			if(this.element_chart !== null) this.element_chart.style.display = 'none';
			if(this.element_legend !== null) this.element_legend.style.display = 'none';
			if(this.element_loading !== null) this.element_loading.style.display = 'inline-block';
			this.___showsLoading___ = true;
			this.___isHidden___ = undefined;
			this.element_loading.innerHTML = 'chart ' + this.id + ' is loading...';
			this.tm.last_hidden = new Date().getTime();
		}
	}

	chartState.prototype.isVisible = function() {
		// this.log('last_visible_check: ' + this.tm.last_visible_check + ', last_page_scroll: ' + NETDATA.options.last_page_scroll);

		// caching - we do not evaluate the charts visibility
		// if the page has not been scrolled since the last check
		if(this.tm.last_visible_check > NETDATA.options.last_page_scroll) {
			if(this.debug === true)
				this.log('isVisible: ' + this.___isVisible___);

			return this.___isVisible___;
		}

		this.tm.last_visible_check = new Date().getTime();

		var wh = window.innerHeight;
		var x = this.element.getBoundingClientRect();
		var ret = 0;
		var tolerance = 0;

		if(x.top < 0 && -x.top > x.height) {
			// the chart is entirely above
			ret = -x.top - x.height;
		}
		else if(x.top > wh) {
			// the chart is entirely below
			ret = x.top - wh;
		}

		if(ret > tolerance) {
			// the chart is too far
			this.___isVisible___ = false;
			if(this.chart_created === true) this.hideChart();
			
			if(this.debug === true)
				this.log('isVisible: ' + this.___isVisible___);

			return this.___isVisible___;
		}
		else {
			// the chart is inside or very close
			this.___isVisible___ = true;
			this.unhideChart();
			
			if(this.debug === true)
				this.log('isVisible: ' + this.___isVisible___);

			return this.___isVisible___;
		}
	}

	chartState.prototype.isAutoRefreshed = function() {
		return (this.current.autorefresh);
	}

	chartState.prototype.canBeAutoRefreshed = function() {
		now = new Date().getTime();

		if(this.enabled === false) {
			if(this.debug === true)
				this.log('I am not enabled');

			return false;
		}

		if(this.library === null || this.library.enabled === false) {
			this.error('charting library "' + this.library_name + '" is not available');
			if(this.debug === true)
				this.log('My chart library ' + this.library_name + ' is not available');

			return false;
		}

		if(this.isVisible() === false) {
			if(NETDATA.options.debug.visibility === true || this.debug === true)
				this.log('I am not visible');

			return false;
		}
		
		if(this.current.force_update_at !== 0 && this.current.force_update_at < now) {
			if(this.debug === true)
				this.log('timed force update detected - allowing this update');

			this.current.force_update_at = 0;
			return true;
		}

		if(this.isAutoRefreshed() === true) {
			// allow the first update, even if the page is not visible
			if(this.updates_counter && NETDATA.options.page_is_visible === false) {
				if(NETDATA.options.debug.focus === true || this.debug === true)
					this.log('canBeAutoRefreshed(): page does not have focus');

				return false;
			}

			if(this.needsRecreation() === true) {
				if(this.debug === true)
					this.log('canBeAutoRefreshed(): needs re-creation.');

				return true;
			}

			// options valid only for autoRefresh()
			if(NETDATA.options.auto_refresher_stop_until === 0 || NETDATA.options.auto_refresher_stop_until < now) {
				if(NETDATA.globalPanAndZoom.isActive()) {
					if(NETDATA.globalPanAndZoom.shouldBeAutoRefreshed(this)) {
						if(this.debug === true)
							this.log('canBeAutoRefreshed(): global panning: I need an update.');

						return true;
					}
					else {
						if(this.debug === true)
							this.log('canBeAutoRefreshed(): global panning: I am already up to date.');

						return false;
					}
				}

				if(this.selected === true) {
					if(this.debug === true)
						this.log('canBeAutoRefreshed(): I have a selection in place.');

					return false;
				}

				if(this.paused === true) {
					if(this.debug === true)
						this.log('canBeAutoRefreshed(): I am paused.');

					return false;
				}

				if(now - this.tm.last_autorefreshed >= this.data_update_every) {
					if(this.debug === true)
						this.log('canBeAutoRefreshed(): It is time to update me.');

					return true;
				}
			}
		}

		return false;
	}

	chartState.prototype.autoRefresh = function(callback) {
		if(this.canBeAutoRefreshed() === true) {
			this.updateChart(callback);
		}
		else {
			if(typeof callback !== 'undefined')
				callback();
		}
	}

	chartState.prototype._defaultsFromDownloadedChart = function(chart) {
		this.chart = chart;
		this.chart_url = chart.url;
		this.data_update_every = chart.update_every * 1000;
		this.data_points = Math.round(this.chartWidth() / this.chartPixelsPerPoint());
		this.tm.last_info_downloaded = new Date().getTime();
	}

	// fetch the chart description from the netdata server
	chartState.prototype.getChart = function(callback) {
		this.chart = NETDATA.chartRegistry.get(this.host, this.id);
		if(this.chart) {
			this._defaultsFromDownloadedChart(this.chart);
			if(typeof callback === 'function') callback();
		}
		else {
			this.chart_url = this.host + "/api/v1/chart?chart=" + this.id;

			if(this.debug === true)
				this.log('downloading ' + this.chart_url);

			var self = this;

			$.ajax( {
				url:  this.chart_url,
				crossDomain: NETDATA.options.crossDomainAjax,
				cache: false,
				async: true
			})
			.done(function(chart) {
				chart.url = self.chart_url;
				chart.data_url = (self.host + chart.data_url);
				self._defaultsFromDownloadedChart(chart);
				NETDATA.chartRegistry.add(self.host, self.id, chart);
			})
			.fail(function() {
				NETDATA.error(404, self.chart_url);
				self.error('chart not found on url "' + self.chart_url + '"');
			})
			.always(function() {
				if(typeof callback === 'function') callback();
			});
		}
	}

	// resize the chart to its real dimensions
	// as given by the caller
	chartState.prototype.sizeChart = function() {
		this.element.className += " netdata-container";

		if(this.debug === true)
			this.log('sizing element');

		if(this.width !== 0)
			$(this.element).css('width', this.width);

		if(this.height !== 0)
			$(this.element).css('height', this.height);

		if(NETDATA.chartDefaults.min_width !== null)
			$(this.element).css('min-width', NETDATA.chartDefaults.min_width);
	}

	chartState.prototype.noData = function() {
		if(this.dom_created === false)
			this.createChartDOM();

		this.tm.last_autorefreshed = new Date().getTime();
		this.data_update_every = 30 * 1000;
	}

	// show a message in the chart
	chartState.prototype.message = function(type, msg) {
		this.hideChart();
		this.element_message.innerHTML = msg;

		if(this.debug === null)
			this.log(msg);
	}

	// show an error on the chart and stop it forever
	chartState.prototype.error = function(msg) {
		this.message('error', this.id + ': ' + msg);
		this.enabled = false;
	}

	// show a message indicating the chart is loading
	chartState.prototype.info = function(msg) {
		this.message('info', this.id + ': ' + msg);
	}

	chartState.prototype.init = function() {
		this.element.innerHTML = '';

		this.element_message = document.createElement('div');
		this.element_message.className += ' netdata-message';
		this.element.appendChild(this.element_message);

		this.element_loading = document.createElement('div');
		this.element_loading.className += ' netdata-chart-is-loading';
		this.element.appendChild(this.element_loading);

		if(this.debug === null)
			this.log('created');

		this.sizeChart();

		// make sure the host does not end with /
		// all netdata API requests use absolute paths
		while(this.host.slice(-1) === '/')
			this.host = this.host.substring(0, this.host.length - 1);

		// check the requested library is available
		// we don't initialize it here - it will be initialized when
		// this chart will be first used
		if(typeof NETDATA.chartLibraries[this.library_name] === 'undefined') {
			NETDATA.error(402, this.library_name);
			this.error('chart library "' + this.library_name + '" is not found');
		}
		else if(NETDATA.chartLibraries[this.library_name].enabled === false) {
			NETDATA.error(403, this.library_name);
			this.error('chart library "' + this.library_name + '" is not enabled');
		}
		else
			this.library = NETDATA.chartLibraries[this.library_name];

		// if we need to report the rendering speed
		// find the element that needs to be updated
		if(this.refresh_dt_element_name)
			this.refresh_dt_element = document.getElementById(this.refresh_dt_element_name) || null;

		// the default mode for all charts
		this.setMode('auto');
	}

	// get or create a chart state, given a DOM element
	NETDATA.chartState = function(element) {
		var state = $(element).data('netdata-state-object') || null;
		if(state === null) {
			state = new chartState(element);
			$(element).data('netdata-state-object', state);
		}
		return state;
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Library functions

	// Load a script without jquery
	// This is used to load jquery - after it is loaded, we use jquery
	NETDATA._loadjQuery = function(callback) {
		if(typeof jQuery === 'undefined') {
			if(NETDATA.options.debug.main_loop === true)
				console.log('loading ' + NETDATA.jQuery);

			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = true;
			script.src = NETDATA.jQuery;

			// script.onabort = onError;
			script.onerror = function(err, t) { NETDATA.error(101, NETDATA.jQuery); };
			if(typeof callback === "function")
				script.onload = callback;

			var s = document.getElementsByTagName('script')[0];
			s.parentNode.insertBefore(script, s);
		}
		else if(typeof callback === "function")
			callback();
	}

	NETDATA._loadCSS = function(filename) {
		// don't use jQuery here
		// styles are loaded before jQuery
		// to eliminate showing an unstyled page to the user
		
		var fileref = document.createElement("link");
		fileref.setAttribute("rel", "stylesheet");
		fileref.setAttribute("type", "text/css");
		fileref.setAttribute("href", filename);

		if (typeof fileref !== 'undefined')
			document.getElementsByTagName("head")[0].appendChild(fileref);
	}

	NETDATA.colorHex2Rgb = function(hex) {
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
			hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}

	NETDATA.colorLuminance = function(hex, lum) {
		// validate hex string
		hex = String(hex).replace(/[^0-9a-f]/gi, '');
		if (hex.length < 6)
			hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];

		lum = lum || 0;

		// convert to decimal and change luminosity
		var rgb = "#", c, i;
		for (i = 0; i < 3; i++) {
			c = parseInt(hex.substr(i*2,2), 16);
			c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
			rgb += ("00"+c).substr(c.length);
		}

		return rgb;
	}

	NETDATA.guid = function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1);
			}

			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	NETDATA.zeropad = function(x) {
		if(x > -10 && x < 10) return '0' + x.toString();
		else return x.toString();
	}

	// user function to signal us the DOM has been
	// updated.
	NETDATA.updatedDom = function() {
		NETDATA.options.updated_dom = true;
	}

	NETDATA.ready = function(callback) {
		NETDATA.options.readyCallback = callback;
	}

	NETDATA.pause = function(callback) {
		NETDATA.options.pauseCallback = callback;
	}

	NETDATA.unpause = function() {
		NETDATA.options.pauseCallback = null;
		NETDATA.options.updated_dom = true;
		NETDATA.options.pause = false;
	}

	// ----------------------------------------------------------------------------------------------------------------

	// this is purely sequencial charts refresher
	// it is meant to be autonomous
	NETDATA.chartRefresherNoParallel = function(index) {
		if(NETDATA.options.debug.mail_loop === true)
			console.log('NETDATA.chartRefresherNoParallel(' + index + ')');

		if(NETDATA.options.updated_dom === true) {
			// the dom has been updated
			// get the dom parts again
			NETDATA.parseDom(NETDATA.chartRefresher);
			return;
		}
		if(index >= NETDATA.options.targets.length) {
			if(NETDATA.options.debug.main_loop === true)
				console.log('waiting to restart main loop...');

			NETDATA.options.auto_refresher_fast_weight = 0;

			setTimeout(function() {
				NETDATA.chartRefresher();
			}, NETDATA.options.current.idle_between_loops);
		}
		else {
			var state = NETDATA.options.targets[index];

			if(NETDATA.options.auto_refresher_fast_weight < NETDATA.options.current.fast_render_timeframe) {
				if(NETDATA.options.debug.main_loop === true)
					console.log('fast rendering...');

				state.autoRefresh(function() {
					NETDATA.chartRefresherNoParallel(++index);
				});
			}
			else {
				if(NETDATA.options.debug.main_loop === true) console.log('waiting for next refresh...');
				NETDATA.options.auto_refresher_fast_weight = 0;

				setTimeout(function() {
					state.autoRefresh(function() {
						NETDATA.chartRefresherNoParallel(++index);
					});
				}, NETDATA.options.current.idle_between_charts);
			}
		}
	}

	// this is part of the parallel refresher
	// its cause is to refresh sequencially all the charts
	// that depend on chart library initialization
	// it will call the parallel refresher back
	// as soon as it sees a chart that its chart library
	// is initialized
	NETDATA.chartRefresher_unitialized = function() {
		if(NETDATA.options.updated_dom === true) {
			// the dom has been updated
			// get the dom parts again
			NETDATA.parseDom(NETDATA.chartRefresher);
			return;
		}
		
		if(NETDATA.options.sequencial.length === 0)
			NETDATA.chartRefresher();
		else {
			var state = NETDATA.options.sequencial.pop();
			if(state.library.initialized === true)
				NETDATA.chartRefresher();
			else
				state.autoRefresh(NETDATA.chartRefresher_unitialized);
		}
	}

	NETDATA.chartRefresherWaitTime = function() {
		return NETDATA.options.current.idle_parallel_loops;
	}

	// the default refresher
	// it will create 2 sets of charts:
	// - the ones that can be refreshed in parallel
	// - the ones that depend on something else
	// the first set will be executed in parallel
	// the second will be given to NETDATA.chartRefresher_unitialized()
	NETDATA.chartRefresher = function() {
		if(NETDATA.options.pause === true) {
			// console.log('auto-refresher is paused');
			setTimeout(NETDATA.chartRefresher,
				NETDATA.chartRefresherWaitTime());
			return;
		}

		if(typeof NETDATA.options.pauseCallback === 'function') {
			// console.log('auto-refresher is calling pauseCallback');
			NETDATA.options.pause = true;
			NETDATA.options.pauseCallback();
			NETDATA.chartRefresher();
			return;
		}

		if(NETDATA.options.current.parallel_refresher === false) {
			NETDATA.chartRefresherNoParallel(0);
			return;
		}

		if(NETDATA.options.updated_dom === true) {
			// the dom has been updated
			// get the dom parts again
			NETDATA.parseDom(NETDATA.chartRefresher);
			return;
		}

		var parallel = new Array();
		var targets = NETDATA.options.targets;
		var len = targets.length;
		while(len--) {
			if(targets[len].isVisible() === false)
				continue;

			var state = targets[len];
			if(state.library.initialized === false) {
				if(state.library.enabled === true) {
					state.library.initialize(NETDATA.chartRefresher);
					return;
				}
				else {
					state.error('chart library "' + state.library_name + '" is not enabled.');
					state.enabled = false;
				}
			}

			parallel.unshift(state);
		}

		if(parallel.length > 0) {
			var parallel_jobs = parallel.length;

			// this will execute the jobs in parallel
			$(parallel).each(function() {
				this.autoRefresh(function() {
					parallel_jobs--;
					
					if(parallel_jobs === 0) {
						setTimeout(NETDATA.chartRefresher,
							NETDATA.chartRefresherWaitTime());
					}
				});
			})
		}
		else {
			setTimeout(NETDATA.chartRefresher,
				NETDATA.chartRefresherWaitTime());
		}
	}

	NETDATA.parseDom = function(callback) {
		NETDATA.options.last_page_scroll = new Date().getTime();
		NETDATA.options.updated_dom = false;

		var targets = $('div[data-netdata]').filter(':visible');

		if(NETDATA.options.debug.main_loop === true)
			console.log('DOM updated - there are ' + targets.length + ' charts on page.');

		NETDATA.options.targets = new Array();
		var len = targets.length;
		while(len--) {
			// the initialization will take care of sizing
			// and the "loading..." message
			NETDATA.options.targets.push(NETDATA.chartState(targets[len]));
		}

		if(typeof callback === 'function') callback();
	}

	// this is the main function - where everything starts
	NETDATA.start = function() {
		// this should be called only once

		NETDATA.options.page_is_visible = true;

		$(window).blur(function() {
			if(NETDATA.options.current.stop_updates_when_focus_is_lost === true) {
				NETDATA.options.page_is_visible = false;
				if(NETDATA.options.debug.focus === true)
					console.log('Lost Focus!');
			}
		});

		$(window).focus(function() {
			if(NETDATA.options.current.stop_updates_when_focus_is_lost === true) {
				NETDATA.options.page_is_visible = true;
				if(NETDATA.options.debug.focus === true)
					console.log('Focus restored!');
			}
		});

		if(typeof document.hasFocus === 'function' && !document.hasFocus()) {
			if(NETDATA.options.current.stop_updates_when_focus_is_lost === true) {
				NETDATA.options.page_is_visible = false;
				if(NETDATA.options.debug.focus === true)
					console.log('Document has no focus!');
			}
		}

		NETDATA.parseDom(NETDATA.chartRefresher);
	}

	// ----------------------------------------------------------------------------------------------------------------
	// peity

	NETDATA.peityInitialize = function(callback) {
		if(typeof netdataNoPeitys === 'undefined' || !netdataNoPeitys) {
			$.ajax({
				url: NETDATA.peity_js,
				cache: true,
				dataType: "script"
			})
			.done(function() {
				NETDATA.registerChartLibrary('peity', NETDATA.peity_js);
			})
			.fail(function() {
				NETDATA.chartLibraries.peity.enabled = false;
				NETDATA.error(100, NETDATA.peity_js);
			})
			.always(function() {
				if(typeof callback === "function")
					callback();
			});
		}
		else {
			NETDATA.chartLibraries.peity.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.peityChartUpdate = function(state, data) {
		state.peity_instance.innerHTML = data.result;

		if(state.peity_options.stroke !== state.chartColors()[0]) {
			state.peity_options.stroke = state.chartColors()[0];
			if(state.chart.chart_type === 'line')
				state.peity_options.fill = '#FFF';
			else
				state.peity_options.fill = NETDATA.colorLuminance(state.chartColors()[0], NETDATA.chartDefaults.fill_luminance);
		}

		$(state.peity_instance).peity('line', state.peity_options);
	}

	NETDATA.peityChartCreate = function(state, data) {
		state.peity_instance = document.createElement('div');
		state.element_chart.appendChild(state.peity_instance);

		var self = $(state.element);
		state.peity_options = {
			stroke: '#000',
			strokeWidth: self.data('peity-strokewidth') || 1,
			width: state.chartWidth(),
			height: state.chartHeight(),
			fill: '#000'
		};

		NETDATA.peityChartUpdate(state, data);
	}

	// ----------------------------------------------------------------------------------------------------------------
	// sparkline

	NETDATA.sparklineInitialize = function(callback) {
		if(typeof netdataNoSparklines === 'undefined' || !netdataNoSparklines) {
			$.ajax({
				url: NETDATA.sparkline_js,
				cache: true,
				dataType: "script"
			})
			.done(function() {
				NETDATA.registerChartLibrary('sparkline', NETDATA.sparkline_js);
			})
			.fail(function() {
				NETDATA.chartLibraries.sparkline.enabled = false;
				NETDATA.error(100, NETDATA.sparkline_js);
			})
			.always(function() {
				if(typeof callback === "function")
					callback();
			});
		}
		else {
			NETDATA.chartLibraries.sparkline.enabled = false;
			if(typeof callback === "function") 
				callback();
		}
	};

	NETDATA.sparklineChartUpdate = function(state, data) {
		state.sparkline_options.width = state.chartWidth();
		state.sparkline_options.height = state.chartHeight();

		$(state.element_chart).sparkline(data.result, state.sparkline_options);
	}

	NETDATA.sparklineChartCreate = function(state, data) {
		var self = $(state.element);
		var type = self.data('sparkline-type') || 'line';
		var lineColor = self.data('sparkline-linecolor') || state.chartColors()[0];
		var fillColor = self.data('sparkline-fillcolor') || (state.chart.chart_type === 'line')?'#FFF':NETDATA.colorLuminance(lineColor, NETDATA.chartDefaults.fill_luminance);
		var chartRangeMin = self.data('sparkline-chartrangemin') || undefined;
		var chartRangeMax = self.data('sparkline-chartrangemax') || undefined;
		var composite = self.data('sparkline-composite') || undefined;
		var enableTagOptions = self.data('sparkline-enabletagoptions') || undefined;
		var tagOptionPrefix = self.data('sparkline-tagoptionprefix') || undefined;
		var tagValuesAttribute = self.data('sparkline-tagvaluesattribute') || undefined;
		var disableHiddenCheck = self.data('sparkline-disablehiddencheck') || undefined;
		var defaultPixelsPerValue = self.data('sparkline-defaultpixelspervalue') || undefined;
		var spotColor = self.data('sparkline-spotcolor') || undefined;
		var minSpotColor = self.data('sparkline-minspotcolor') || undefined;
		var maxSpotColor = self.data('sparkline-maxspotcolor') || undefined;
		var spotRadius = self.data('sparkline-spotradius') || undefined;
		var valueSpots = self.data('sparkline-valuespots') || undefined;
		var highlightSpotColor = self.data('sparkline-highlightspotcolor') || undefined;
		var highlightLineColor = self.data('sparkline-highlightlinecolor') || undefined;
		var lineWidth = self.data('sparkline-linewidth') || undefined;
		var normalRangeMin = self.data('sparkline-normalrangemin') || undefined;
		var normalRangeMax = self.data('sparkline-normalrangemax') || undefined;
		var drawNormalOnTop = self.data('sparkline-drawnormalontop') || undefined;
		var xvalues = self.data('sparkline-xvalues') || undefined;
		var chartRangeClip = self.data('sparkline-chartrangeclip') || undefined;
		var xvalues = self.data('sparkline-xvalues') || undefined;
		var chartRangeMinX = self.data('sparkline-chartrangeminx') || undefined;
		var chartRangeMaxX = self.data('sparkline-chartrangemaxx') || undefined;
		var disableInteraction = self.data('sparkline-disableinteraction') || false;
		var disableTooltips = self.data('sparkline-disabletooltips') || false;
		var disableHighlight = self.data('sparkline-disablehighlight') || false;
		var highlightLighten = self.data('sparkline-highlightlighten') || 1.4;
		var highlightColor = self.data('sparkline-highlightcolor') || undefined;
		var tooltipContainer = self.data('sparkline-tooltipcontainer') || undefined;
		var tooltipClassname = self.data('sparkline-tooltipclassname') || undefined;
		var tooltipFormat = self.data('sparkline-tooltipformat') || undefined;
		var tooltipPrefix = self.data('sparkline-tooltipprefix') || undefined;
		var tooltipSuffix = self.data('sparkline-tooltipsuffix') || ' ' + state.chart.units;
		var tooltipSkipNull = self.data('sparkline-tooltipskipnull') || true;
		var tooltipValueLookups = self.data('sparkline-tooltipvaluelookups') || undefined;
		var tooltipFormatFieldlist = self.data('sparkline-tooltipformatfieldlist') || undefined;
		var tooltipFormatFieldlistKey = self.data('sparkline-tooltipformatfieldlistkey') || undefined;
		var numberFormatter = self.data('sparkline-numberformatter') || function(n){ return n.toFixed(2); };
		var numberDigitGroupSep = self.data('sparkline-numberdigitgroupsep') || undefined;
		var numberDecimalMark = self.data('sparkline-numberdecimalmark') || undefined;
		var numberDigitGroupCount = self.data('sparkline-numberdigitgroupcount') || undefined;
		var animatedZooms = self.data('sparkline-animatedzooms') || false;

		state.sparkline_options = {
			type: type,
			lineColor: lineColor,
			fillColor: fillColor,
			chartRangeMin: chartRangeMin,
			chartRangeMax: chartRangeMax,
			composite: composite,
			enableTagOptions: enableTagOptions,
			tagOptionPrefix: tagOptionPrefix,
			tagValuesAttribute: tagValuesAttribute,
			disableHiddenCheck: disableHiddenCheck,
			defaultPixelsPerValue: defaultPixelsPerValue,
			spotColor: spotColor,
			minSpotColor: minSpotColor,
			maxSpotColor: maxSpotColor,
			spotRadius: spotRadius,
			valueSpots: valueSpots,
			highlightSpotColor: highlightSpotColor,
			highlightLineColor: highlightLineColor,
			lineWidth: lineWidth,
			normalRangeMin: normalRangeMin,
			normalRangeMax: normalRangeMax,
			drawNormalOnTop: drawNormalOnTop,
			xvalues: xvalues,
			chartRangeClip: chartRangeClip,
			chartRangeMinX: chartRangeMinX,
			chartRangeMaxX: chartRangeMaxX,
			disableInteraction: disableInteraction,
			disableTooltips: disableTooltips,
			disableHighlight: disableHighlight,
			highlightLighten: highlightLighten,
			highlightColor: highlightColor,
			tooltipContainer: tooltipContainer,
			tooltipClassname: tooltipClassname,
			tooltipChartTitle: state.chart.title,
			tooltipFormat: tooltipFormat,
			tooltipPrefix: tooltipPrefix,
			tooltipSuffix: tooltipSuffix,
			tooltipSkipNull: tooltipSkipNull,
			tooltipValueLookups: tooltipValueLookups,
			tooltipFormatFieldlist: tooltipFormatFieldlist,
			tooltipFormatFieldlistKey: tooltipFormatFieldlistKey,
			numberFormatter: numberFormatter,
			numberDigitGroupSep: numberDigitGroupSep,
			numberDecimalMark: numberDecimalMark,
			numberDigitGroupCount: numberDigitGroupCount,
			animatedZooms: animatedZooms,
			width: state.chartWidth(),
			height: state.chartHeight()
		};

		$(state.element_chart).sparkline(data.result, state.sparkline_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// dygraph

	NETDATA.dygraph = {
		smooth: false
	};

	NETDATA.dygraphSetSelection = function(state, t) {
		if(typeof state.dygraph_instance !== 'undefined') {
			var r = state.calculateRowForTime(t);
			if(r !== -1)
				state.dygraph_instance.setSelection(r);
			else {
				state.dygraph_instance.clearSelection();
				state.legendShowUndefined();
			}
		}

		return true;
	}

	NETDATA.dygraphClearSelection = function(state, t) {
		if(typeof state.dygraph_instance !== 'undefined') {
			state.dygraph_instance.clearSelection();
		}
		return true;
	}

	NETDATA.dygraphSmoothInitialize = function(callback) {
		$.ajax({
			url: NETDATA.dygraph_smooth_js,
			cache: true,
			dataType: "script"
		})
		.done(function() {
			NETDATA.dygraph.smooth = true;
			smoothPlotter.smoothing = 0.3;
		})
		.fail(function() {
			NETDATA.dygraph.smooth = false;
		})
		.always(function() {
			if(typeof callback === "function")
				callback();
		});
	}

	NETDATA.dygraphInitialize = function(callback) {
		if(typeof netdataNoDygraphs === 'undefined' || !netdataNoDygraphs) {
			$.ajax({
				url: NETDATA.dygraph_js,
				cache: true,
				dataType: "script"
			})
			.done(function() {
				NETDATA.registerChartLibrary('dygraph', NETDATA.dygraph_js);
			})
			.fail(function() {
				NETDATA.chartLibraries.dygraph.enabled = false;
				NETDATA.error(100, NETDATA.dygraph_js);
			})
			.always(function() {
				if(NETDATA.chartLibraries.dygraph.enabled === true && NETDATA.options.current.smooth_plot === true)
					NETDATA.dygraphSmoothInitialize(callback);
				else if(typeof callback === "function")
					callback();
			});
		}
		else {
			NETDATA.chartLibraries.dygraph.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.dygraphChartUpdate = function(state, data) {
		var dygraph = state.dygraph_instance;
		
		if(typeof dygraph === 'undefined')
			NETDATA.dygraphChartCreate(state, data);

		// when the chart is not visible, and hidden
		// if there is a window resize, dygraph detects
		// its element size as 0x0.
		// this will make it re-appear properly

		if(state.tm.last_unhidden > state.dygraph_last_rendered)
			dygraph.resize();

		var options = {
				file: data.result.data,
				colors: state.chartColors(),
				labels: data.result.labels,
				labelsDivWidth: state.chartWidth() - 70
		}

		if(state.current.name === 'pan') {
			if(NETDATA.options.debug.dygraph === true || state.debug === true)
				state.log('dygraphChartUpdate() loose update');
		}
		else {
			if(NETDATA.options.debug.dygraph === true || state.debug === true)
				state.log('dygraphChartUpdate() strict update');
			
			options.dateWindow = null;
			options.valueRange = null;
		}

		if(state.dygraph_smooth_eligible === true) {
			if((NETDATA.options.current.smooth_plot === true && state.dygraph_options.plotter !== smoothPlotter)
				|| (NETDATA.options.current.smooth_plot === false && state.dygraph_options.plotter === smoothPlotter)) {
				NETDATA.dygraphChartCreate(state, data);
				return;
			}
		}

		dygraph.updateOptions(options);
		state.dygraph_last_rendered = new Date().getTime();
	};

	NETDATA.dygraphChartCreate = function(state, data) {
		if(NETDATA.options.debug.dygraph === true || state.debug === true)
			state.log('dygraphChartCreate()');

		var self = $(state.element);

		var chart_type = state.chart.chart_type;
		if(chart_type === 'stacked' && data.dimensions === 1) chart_type = 'area';
		chart_type = self.data('dygraph-type') || chart_type;

		var smooth = (chart_type === 'line' && !NETDATA.chartLibraries.dygraph.isSparkline(state))?true:false;
		smooth = self.data('dygraph-smooth') || smooth;

		if(NETDATA.dygraph.smooth === false)
			smooth = false;

		var strokeWidth = (chart_type === 'stacked')?0.0:((smooth)?1.5:1.0)
		var highlightCircleSize = (NETDATA.chartLibraries.dygraph.isSparkline(state))?3:4;

		state.dygraph_options = {
			colors: self.data('dygraph-colors') || state.chartColors(),
			
			// leave a few pixels empty on the right of the chart
			rightGap: self.data('dygraph-rightgap') || 5,
			showRangeSelector: self.data('dygraph-showrangeselector') || false,
			showRoller: self.data('dygraph-showroller') || false,

			title: self.data('dygraph-title') || state.chart.title,
			titleHeight: self.data('dygraph-titleheight') || 19,

			legend: self.data('dygraph-legend') || 'always', // 'onmouseover',
			labels: data.result.labels,
			labelsDiv: self.data('dygraph-labelsdiv') || state.element_legend_childs.hidden,
			labelsDivStyles: self.data('dygraph-labelsdivstyles') || { 'fontSize':'10px', 'zIndex': 10000 },
			labelsDivWidth: self.data('dygraph-labelsdivwidth') || state.chartWidth() - 70,
			labelsSeparateLines: self.data('dygraph-labelsseparatelines') || true,
			labelsShowZeroValues: self.data('dygraph-labelsshowzerovalues') || true,
			labelsKMB: false,
			labelsKMG2: false,
			showLabelsOnHighlight: self.data('dygraph-showlabelsonhighlight') || true,
			hideOverlayOnMouseOut: self.data('dygraph-hideoverlayonmouseout') || true,

			ylabel: state.chart.units,
			yLabelWidth: self.data('dygraph-ylabelwidth') || 12,

			// the function to plot the chart
			plotter: null,

			// The width of the lines connecting data points. This can be used to increase the contrast or some graphs.
			strokeWidth: self.data('dygraph-strokewidth') || strokeWidth,
			strokePattern: self.data('dygraph-strokepattern') || undefined,

			// The size of the dot to draw on each point in pixels (see drawPoints). A dot is always drawn when a point is "isolated",
			// i.e. there is a missing point on either side of it. This also controls the size of those dots.
			drawPoints: self.data('dygraph-drawpoints') || false,
			
			// Draw points at the edges of gaps in the data. This improves visibility of small data segments or other data irregularities.
			drawGapEdgePoints: self.data('dygraph-drawgapedgepoints') || true,

			connectSeparatedPoints: self.data('dygraph-connectseparatedpoints') || false,
			pointSize: self.data('dygraph-pointsize') || 1,

			// enabling this makes the chart with little square lines
			stepPlot: self.data('dygraph-stepplot') || false,
			
			// Draw a border around graph lines to make crossing lines more easily distinguishable. Useful for graphs with many lines.
			strokeBorderColor: self.data('dygraph-strokebordercolor') || 'white',
			strokeBorderWidth: self.data('dygraph-strokeborderwidth') || (chart_type === 'stacked')?0.0:0.0,

			fillGraph: self.data('dygraph-fillgraph') || (chart_type === 'area')?true:false,
			fillAlpha: self.data('dygraph-fillalpha') || (chart_type === 'stacked')?0.8:0.2,
			stackedGraph: self.data('dygraph-stackedgraph') || (chart_type === 'stacked')?true:false,
			stackedGraphNaNFill: self.data('dygraph-stackedgraphnanfill') || 'none',
			
			drawAxis: self.data('dygraph-drawaxis') || true,
			axisLabelFontSize: self.data('dygraph-axislabelfontsize') || 10,
			axisLineColor: self.data('dygraph-axislinecolor') || '#CCC',
			axisLineWidth: self.data('dygraph-axislinewidth') || 0.3,

			drawGrid: self.data('dygraph-drawgrid') || true,
			drawXGrid: self.data('dygraph-drawxgrid') || undefined,
			drawYGrid: self.data('dygraph-drawygrid') || undefined,
			gridLinePattern: self.data('dygraph-gridlinepattern') || null,
			gridLineWidth: self.data('dygraph-gridlinewidth') || 0.3,
			gridLineColor: self.data('dygraph-gridlinecolor') || '#DDD',

			maxNumberWidth: self.data('dygraph-maxnumberwidth') || 8,
			sigFigs: self.data('dygraph-sigfigs') || null,
			digitsAfterDecimal: self.data('dygraph-digitsafterdecimal') || 2,
			valueFormatter: self.data('dygraph-valueformatter') || function(x){ return x.toFixed(2); },

			highlightCircleSize: self.data('dygraph-highlightcirclesize') || highlightCircleSize,
			highlightSeriesOpts: self.data('dygraph-highlightseriesopts') || null, // TOO SLOW: { strokeWidth: 1.5 },
			highlightSeriesBackgroundAlpha: self.data('dygraph-highlightseriesbackgroundalpha') || null, // TOO SLOW: (chart_type === 'stacked')?0.7:0.5,

			pointClickCallback: self.data('dygraph-pointclickcallback') || undefined,
			axes: {
				x: {
					pixelsPerLabel: 50,
					ticker: Dygraph.dateTicker,
					axisLabelFormatter: function (d, gran) {
						return NETDATA.zeropad(d.getHours()) + ":" + NETDATA.zeropad(d.getMinutes()) + ":" + NETDATA.zeropad(d.getSeconds());
					},
					valueFormatter: function (ms) {
						var d = new Date(ms);
						return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
						// return NETDATA.zeropad(d.getHours()) + ":" + NETDATA.zeropad(d.getMinutes()) + ":" + NETDATA.zeropad(d.getSeconds());
					}
				},
				y: {
					pixelsPerLabel: 15,
					valueFormatter: function (x) {
						// return (Math.round(x*100) / 100).toLocaleString();
						//return state.legendFormatValue(x);
						//FIXME
						return x;
					}
				}
			},
			legendFormatter: function(data) {
				var g = data.dygraph;
				var html;
				var elements = state.element_legend_childs;

				// if the hidden div is not there
				// we are not managing the legend
				if(elements.hidden === null) return;

				if (typeof data.x === 'undefined') {
					state.legendReset();
				}
				else {
					state.legendSetDate(data.x);
					var i = data.series.length;
					while(i--) {
						var series = data.series[i];
						if(!series.isVisible) continue;
						state.legendSetLabelValue(series.label, series.y);
					}
				}

				return '';
			},
			drawCallback: function(dygraph, is_initial) {
				if(state.current.name !== 'auto') {
					if(NETDATA.options.debug.dygraph === true)
						state.log('dygraphDrawCallback()');

					var first = state.data.first_entry * 1000;
					var last = state.data.last_entry * 1000;

					var x_range = dygraph.xAxisRange();
					var after = Math.round(x_range[0]);
					var before = Math.round(x_range[1]);

					if(before <= last && after >= first)
						state.updateChartPanOrZoom(after, before);
				}
			},
			zoomCallback: function(minDate, maxDate, yRanges) {
				if(NETDATA.options.debug.dygraph === true)
					state.log('dygraphZoomCallback()');

				state.globalSelectionSyncStop();
				state.globalSelectionSyncDelay();

				if(state.updateChartPanOrZoom(minDate, maxDate) == false) {
					// we should not zoom that much
					state.dygraph_instance.updateOptions({
						dateWindow: null,
						valueRange: null
					});
				}
			},
			highlightCallback: function(event, x, points, row, seriesName) {
				if(NETDATA.options.debug.dygraph === true || state.debug === true)
					state.log('dygraphHighlightCallback()');

				state.pauseChart();

				// there is a bug in dygraph when the chart is zoomed enough
				// the time it thinks is selected is wrong
				// here we calculate the time t based on the row number selected
				// which is ok
				var t = state.data_after + row * state.data_update_every;
				// console.log('row = ' + row + ', x = ' + x + ', t = ' + t + ' ' + ((t === x)?'SAME':'DIFFERENT') + ', rows in db: ' + state.data_points + ' visible(x) = ' + state.timeIsVisible(x) + ' visible(t) = ' + state.timeIsVisible(t) + ' r(x) = ' + state.calculateRowForTime(x) + ' r(t) = ' + state.calculateRowForTime(t) + ' range: ' + state.data_after + ' - ' + state.data_before + ' real: ' + state.data.after + ' - ' + state.data.before + ' every: ' + state.data_update_every);

				state.globalSelectionSync(t);

				// fix legend zIndex using the internal structures of dygraph legend module
				// this works, but it is a hack!
				// state.dygraph_instance.plugins_[0].plugin.legend_div_.style.zIndex = 10000;
			},
			unhighlightCallback: function(event) {
				if(NETDATA.options.debug.dygraph === true || state.debug === true)
					state.log('dygraphUnhighlightCallback()');

				state.unpauseChart();
				state.globalSelectionSyncStop();
			},
			interactionModel : {
				mousedown: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.mousedown()');

					state.globalSelectionSyncStop();

					if(NETDATA.options.debug.dygraph === true)
						state.log('dygraphMouseDown()');

					// Right-click should not initiate a zoom.
					if(event.button && event.button === 2) return;

					context.initializeMouseDown(event, dygraph, context);
					
					if(event.button && event.button === 1) {
						if (event.altKey || event.shiftKey) {
							state.setMode('pan');
							state.globalSelectionSyncDelay();
							Dygraph.startPan(event, dygraph, context);
						}
						else {
							state.setMode('zoom');
							state.globalSelectionSyncDelay();
							Dygraph.startZoom(event, dygraph, context);
						}
					}
					else {
						if (event.altKey || event.shiftKey) {
							state.setMode('zoom');
							state.globalSelectionSyncDelay();
							Dygraph.startZoom(event, dygraph, context);
						}
						else {
							state.setMode('pan');
							state.globalSelectionSyncDelay();
							Dygraph.startPan(event, dygraph, context);
						}
					}
				},
				mousemove: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.mousemove()');

					if(context.isPanning) {
						state.globalSelectionSyncStop();
						state.globalSelectionSyncDelay();
						state.setMode('pan');
						Dygraph.movePan(event, dygraph, context);
					}
					else if(context.isZooming) {
						state.globalSelectionSyncStop();
						state.globalSelectionSyncDelay();
						state.setMode('zoom');
						Dygraph.moveZoom(event, dygraph, context);
					}
				},
				mouseup: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.mouseup()');

					if (context.isPanning) {
						state.globalSelectionSyncDelay();
						Dygraph.endPan(event, dygraph, context);
					}
					else if (context.isZooming) {
						state.globalSelectionSyncDelay();
						Dygraph.endZoom(event, dygraph, context);
					}
				},
				click: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.click()');

					event.preventDefault();
				},
				dblclick: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.dblclick()');

					state.globalSelectionSyncStop();
					NETDATA.globalPanAndZoom.clearMaster();
					state.resetChart();
				},
				mousewheel: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.mousewheel()');

					// Take the offset of a mouse event on the dygraph canvas and
					// convert it to a pair of percentages from the bottom left. 
					// (Not top left, bottom is where the lower value is.)
					function offsetToPercentage(g, offsetX, offsetY) {
						// This is calculating the pixel offset of the leftmost date.
						var xOffset = g.toDomCoords(g.xAxisRange()[0], null)[0];
						var yar0 = g.yAxisRange(0);

						// This is calculating the pixel of the higest value. (Top pixel)
						var yOffset = g.toDomCoords(null, yar0[1])[1];

						// x y w and h are relative to the corner of the drawing area,
						// so that the upper corner of the drawing area is (0, 0).
						var x = offsetX - xOffset;
						var y = offsetY - yOffset;

						// This is computing the rightmost pixel, effectively defining the
						// width.
						var w = g.toDomCoords(g.xAxisRange()[1], null)[0] - xOffset;

						// This is computing the lowest pixel, effectively defining the height.
						var h = g.toDomCoords(null, yar0[0])[1] - yOffset;

						// Percentage from the left.
						var xPct = w === 0 ? 0 : (x / w);
						// Percentage from the top.
						var yPct = h === 0 ? 0 : (y / h);

						// The (1-) part below changes it from "% distance down from the top"
						// to "% distance up from the bottom".
						return [xPct, (1-yPct)];
					}

					// Adjusts [x, y] toward each other by zoomInPercentage%
					// Split it so the left/bottom axis gets xBias/yBias of that change and
					// tight/top gets (1-xBias)/(1-yBias) of that change.
					//
					// If a bias is missing it splits it down the middle.
					function zoomRange(g, zoomInPercentage, xBias, yBias) {
						xBias = xBias || 0.5;
						yBias = yBias || 0.5;

						function adjustAxis(axis, zoomInPercentage, bias) {
							var delta = axis[1] - axis[0];
							var increment = delta * zoomInPercentage;
							var foo = [increment * bias, increment * (1-bias)];

							return [ axis[0] + foo[0], axis[1] - foo[1] ];
						}

						var yAxes = g.yAxisRanges();
						var newYAxes = [];
						for (var i = 0; i < yAxes.length; i++) {
							newYAxes[i] = adjustAxis(yAxes[i], zoomInPercentage, yBias);
						}

						return adjustAxis(g.xAxisRange(), zoomInPercentage, xBias);
					}

					if(event.altKey || event.shiftKey) {
						state.globalSelectionSyncStop();
						state.globalSelectionSyncDelay();

						// http://dygraphs.com/gallery/interaction-api.js
						var normal = (event.detail) ? event.detail * -1 : event.wheelDelta / 40;
						var percentage = normal / 50;

						if (!(event.offsetX && event.offsetY)){
							event.offsetX = event.layerX - event.target.offsetLeft;
							event.offsetY = event.layerY - event.target.offsetTop;
						}

						var percentages = offsetToPercentage(dygraph, event.offsetX, event.offsetY);
						var xPct = percentages[0];
						var yPct = percentages[1];

						var new_x_range = zoomRange(dygraph, percentage, xPct, yPct);

						var after = new_x_range[0];
						var before = new_x_range[1];

						var first = (state.data.first_entry + state.data.view_update_every) * 1000;
						var last = (state.data.last_entry + state.data.view_update_every) * 1000;

						if(before > last) {
							after -= (before - last);
							before = last;
						}
						if(after < first) {
							after = first;
						}

						state.setMode('zoom');
						if(state.updateChartPanOrZoom(after, before) === true)
							dygraph.updateOptions({ dateWindow: [ after, before ] });

						event.preventDefault();
					}
				},
				touchstart: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.touchstart()');

					state.setMode('zoom');
					state.pauseChart();

					Dygraph.defaultInteractionModel.touchstart(event, dygraph, context);

					// we overwrite the touch directions at the end, to overwrite
					// the internal default of dygraphs
					context.touchDirections = { x: true, y: false };

					state.dygraph_last_touch_start = new Date().getTime();
					state.dygraph_last_touch_move = 0;

					if(typeof event.touches[0].pageX === 'number')
						state.dygraph_last_touch_page_x = event.touches[0].pageX;
					else
						state.dygraph_last_touch_page_x = 0;
				},
				touchmove: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.touchmove()');

					Dygraph.defaultInteractionModel.touchmove(event, dygraph, context);

					state.dygraph_last_touch_move = new Date().getTime();
				},
				touchend: function(event, dygraph, context) {
					if(NETDATA.options.debug.dygraph === true || state.debug === true)
						state.log('interactionModel.touchend()');

					Dygraph.defaultInteractionModel.touchend(event, dygraph, context);

					// if it didn't move, it is a selection
					if(state.dygraph_last_touch_move === 0 && state.dygraph_last_touch_page_x !== 0) {
						// internal api of dygraphs
						var pct = (state.dygraph_last_touch_page_x - (dygraph.plotter_.area.x + state.element.getBoundingClientRect().left)) / dygraph.plotter_.area.w;
						var t = Math.round(state.data_after + (state.data_before - state.data_after) * pct);
						if(NETDATA.dygraphSetSelection(state, t) === true)
							state.globalSelectionSync(t);
					}

					// if it was double tap within double click time, reset the charts
					var now = new Date().getTime();
					if(typeof state.dygraph_last_touch_end !== 'undefined') {
						if(state.dygraph_last_touch_move === 0) {
							var dt = now - state.dygraph_last_touch_end;
							if(dt <= NETDATA.options.current.double_click_speed) {
								state.globalSelectionSyncStop();
								NETDATA.globalPanAndZoom.clearMaster();
								state.resetChart();
							}
						}
					}

					// remember the timestamp of the last touch end
					state.dygraph_last_touch_end = now;
				}
			}
		};

		if(NETDATA.chartLibraries.dygraph.isSparkline(state)) {
			state.dygraph_options.drawGrid = false;
			state.dygraph_options.drawAxis = false;
			state.dygraph_options.title = undefined;
			state.dygraph_options.units = undefined;
			state.dygraph_options.ylabel = undefined;
			state.dygraph_options.yLabelWidth = 0;
			state.dygraph_options.labelsDivWidth = 120;
			state.dygraph_options.labelsDivStyles.width = '120px';
			state.dygraph_options.labelsSeparateLines = true;
			state.dygraph_options.rightGap = 0;
		}
		
		if(smooth === true) {
			state.dygraph_smooth_eligible = true;

			if(NETDATA.options.current.smooth_plot === true)
				state.dygraph_options.plotter = smoothPlotter;
		}
		else state.dygraph_smooth_eligible = false;

		state.dygraph_instance = new Dygraph(state.element_chart,
			data.result.data, state.dygraph_options);

		state.dygraph_last_rendered = new Date().getTime();
	};

	// ----------------------------------------------------------------------------------------------------------------
	// morris

	NETDATA.morrisInitialize = function(callback) {
		if(typeof netdataNoMorris === 'undefined' || !netdataNoMorris) {

			// morris requires raphael
			if(!NETDATA.chartLibraries.raphael.initialized) {
				if(NETDATA.chartLibraries.raphael.enabled) {
					NETDATA.raphaelInitialize(function() {
						NETDATA.morrisInitialize(callback);
					});
				}
				else {
					NETDATA.chartLibraries.morris.enabled = false;
					if(typeof callback === "function")
						callback();
				}
			}
			else {
				NETDATA._loadCSS(NETDATA.morris_css);

				$.ajax({
					url: NETDATA.morris_js,
					cache: true,
					dataType: "script"
				})
				.done(function() {
					NETDATA.registerChartLibrary('morris', NETDATA.morris_js);
				})
				.fail(function() {
					NETDATA.chartLibraries.morris.enabled = false;
					NETDATA.error(100, NETDATA.morris_js);
				})
				.always(function() {
					if(typeof callback === "function")
						callback();
				});
			}
		}
		else {
			NETDATA.chartLibraries.morris.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.morrisChartUpdate = function(state, data) {
		state.morris_instance.setData(data.result.data);
	};

	NETDATA.morrisChartCreate = function(state, data) {

		state.morris_options = {
				element: state.element_chart_id,
				data: data.result.data,
				xkey: 'time',
				ykeys: data.dimension_names,
				labels: data.dimension_names,
				lineWidth: 2,
				pointSize: 3,
				smooth: true,
				hideHover: 'auto',
				parseTime: true,
				continuousLine: false,
				behaveLikeLine: false
		};

		if(state.chart.chart_type === 'line')
			state.morris_instance = new Morris.Line(state.morris_options);

		else if(state.chart.chart_type === 'area') {
			state.morris_options.behaveLikeLine = true;
			state.morris_instance = new Morris.Area(state.morris_options);
		}
		else // stacked
			state.morris_instance = new Morris.Area(state.morris_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// raphael

	NETDATA.raphaelInitialize = function(callback) {
		if(typeof netdataStopRaphael === 'undefined' || !netdataStopRaphael) {
			$.ajax({
				url: NETDATA.raphael_js,
				cache: true,
				dataType: "script"
			})
			.done(function() {
				NETDATA.registerChartLibrary('raphael', NETDATA.raphael_js);
			})
			.fail(function() {
				NETDATA.chartLibraries.raphael.enabled = false;
				NETDATA.error(100, NETDATA.raphael_js);
			})
			.always(function() {
				if(typeof callback === "function")
					callback();
			});
		}
		else {
			NETDATA.chartLibraries.raphael.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.raphaelChartUpdate = function(state, data) {
		$(state.element_chart).raphael(data.result, {
			width: state.chartWidth(),
			height: state.chartHeight()
		})
	};

	NETDATA.raphaelChartCreate = function(state, data) {
		$(state.element_chart).raphael(data.result, {
			width: state.chartWidth(),
			height: state.chartHeight()
		})
	};

	// ----------------------------------------------------------------------------------------------------------------
	// google charts

	NETDATA.googleInitialize = function(callback) {
		if(typeof netdataNoGoogleCharts === 'undefined' || !netdataNoGoogleCharts) {
			$.ajax({
				url: NETDATA.google_js,
				cache: true,
				dataType: "script"
			})
			.done(function() {
				NETDATA.registerChartLibrary('google', NETDATA.google_js);
				google.load('visualization', '1.1', {
					'packages': ['corechart', 'controls'],
					'callback': callback
				});
			})
			.fail(function() {
				NETDATA.chartLibraries.google.enabled = false;
				NETDATA.error(100, NETDATA.google_js);
				if(typeof callback === "function")
					callback();
			});
		}
		else {
			NETDATA.chartLibraries.google.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.googleChartUpdate = function(state, data) {
		var datatable = new google.visualization.DataTable(data.result);
		state.google_instance.draw(datatable, state.google_options);
	};

	NETDATA.googleChartCreate = function(state, data) {
		var datatable = new google.visualization.DataTable(data.result);

		state.google_options = {
			// do not set width, height - the chart resizes itself
			//width: state.chartWidth(),
			//height: state.chartHeight(),
			lineWidth: 1,
			title: state.chart.title,
			fontSize: 11,
			hAxis: {
			//	title: "Time of Day",
			//	format:'HH:mm:ss',
				viewWindowMode: 'maximized',
				slantedText: false,
				format:'HH:mm:ss',
				textStyle: {
					fontSize: 9
				},
				gridlines: {
					color: '#EEE'
				}
			},
			vAxis: {
				title: state.chart.units,
				viewWindowMode: 'pretty',
				minValue: -0.1,
				maxValue: 0.1,
				direction: 1,
				textStyle: {
					fontSize: 9
				},
				gridlines: {
					color: '#EEE'
				}
			},
			chartArea: {
				width: '65%',
				height: '80%'
			},
			focusTarget: 'category',
			annotation: {
				'1': {
					style: 'line'
				}
			},
			pointsVisible: 0,
			titlePosition: 'out',
			titleTextStyle: {
				fontSize: 11
			},
			tooltip: {
				isHtml: false,
				ignoreBounds: true,
				textStyle: {
					fontSize: 9
				}
			},
			curveType: 'function',
			areaOpacity: 0.3,
			isStacked: false
		};

		switch(state.chart.chart_type) {
			case "area":
				state.google_options.vAxis.viewWindowMode = 'maximized';
				state.google_instance = new google.visualization.AreaChart(state.element_chart);
				break;

			case "stacked":
				state.google_options.isStacked = true;
				state.google_options.areaOpacity = 0.85;
				state.google_options.vAxis.viewWindowMode = 'maximized';
				state.google_options.vAxis.minValue = null;
				state.google_options.vAxis.maxValue = null;
				state.google_instance = new google.visualization.AreaChart(state.element_chart);
				break;

			default:
			case "line":
				state.google_options.lineWidth = 2;
				state.google_instance = new google.visualization.LineChart(state.element_chart);
				break;
		}

		state.google_instance.draw(datatable, state.google_options);
	};

	// ----------------------------------------------------------------------------------------------------------------
	// easy-pie-chart

	NETDATA.easypiechartInitialize = function(callback) {
		if(typeof netdataNoEasyPieChart === 'undefined' || !netdataNoEasyPieChart) {
			$.ajax({
				url: NETDATA.easypiechart_js,
				cache: true,
				dataType: "script"
			})
				.done(function() {
					NETDATA.registerChartLibrary('easypiechart', NETDATA.easypiechart_js);
				})
				.fail(function() {
					NETDATA.error(100, NETDATA.easypiechart_js);
				})
				.always(function() {
					if(typeof callback === "function")
						callback();
				})
		}
		else {
			NETDATA.chartLibraries.easypiechart.enabled = false;
			if(typeof callback === "function")
				callback();
		}
	};

	NETDATA.easypiechartChartUpdate = function(state, data) {

		state.easypiechart_instance.update();
	};

	NETDATA.easypiechartChartCreate = function(state, data) {
		var self = $(state.element);

		var value = 10;
		var pcent = 10;

		$(state.element_chart).data('data-percent', pcent);
		data.element_chart.innerHTML = value.toString();

		state.easypiechart_instance = new EasyPieChart(state.element_chart, {
			barColor: self.data('easypiechart-barcolor') || '#ef1e25',
			trackColor: self.data('easypiechart-trackcolor') || '#f2f2f2',
			scaleColor: self.data('easypiechart-scalecolor') || '#dfe0e0',
			scaleLength: self.data('easypiechart-scalelength') || 5,
			lineCap: self.data('easypiechart-linecap') || 'round',
			lineWidth: self.data('easypiechart-linewidth') || 3,
			trackWidth: self.data('easypiechart-trackwidth') || undefined,
			size: self.data('easypiechart-size') || Math.min(state.chartWidth(), state.chartHeight()),
			rotate: self.data('easypiechart-rotate') || 0,
			animate: self.data('easypiechart-rotate') || {duration: 0, enabled: false},
			easing: self.data('easypiechart-easing') || undefined
		})
	};

	// ----------------------------------------------------------------------------------------------------------------
	// Charts Libraries Registration

	NETDATA.chartLibraries = {
		"dygraph": {
			initialize: NETDATA.dygraphInitialize,
			create: NETDATA.dygraphChartCreate,
			update: NETDATA.dygraphChartUpdate,
			resize: function(state) {
				if(typeof state.dygraph_instance.resize === 'function')
					state.dygraph_instance.resize();
			},
			setSelection: NETDATA.dygraphSetSelection,
			clearSelection:  NETDATA.dygraphClearSelection,
			initialized: false,
			enabled: true,
			format: function(state) { return 'json'; },
			options: function(state) { return 'ms|flip'; },
			legend: function(state) {
				if(this.isSparkline(state) === false)
					return 'right-side';
				else
					return null;
			},
			autoresize: function(state) { return true; },
			max_updates_to_recreate: function(state) { return 5000; },
			track_colors: function(state) { return true; },
			pixels_per_point: function(state) {
				if(this.isSparkline(state) === false)
					return 3;
				else
					return 2;
			},

			isSparkline: function(state) {
				if(typeof state.dygraph_sparkline === 'undefined') {
					var t = $(state.element).data('dygraph-theme');
					if(t === 'sparkline')
						state.dygraph_sparkline = true;
					else
						state.dygraph_sparkline = false;
				}
				return state.dygraph_sparkline;
			}
		},
		"sparkline": {
			initialize: NETDATA.sparklineInitialize,
			create: NETDATA.sparklineChartCreate,
			update: NETDATA.sparklineChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'array'; },
			options: function(state) { return 'flip|abs'; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 5000; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 3; }
		},
		"peity": {
			initialize: NETDATA.peityInitialize,
			create: NETDATA.peityChartCreate,
			update: NETDATA.peityChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'ssvcomma'; },
			options: function(state) { return 'null2zero|flip|abs'; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 5000; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 3; }
		},
		"morris": {
			initialize: NETDATA.morrisInitialize,
			create: NETDATA.morrisChartCreate,
			update: NETDATA.morrisChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'json'; },
			options: function(state) { return 'objectrows|ms'; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 50; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 15; }
		},
		"google": {
			initialize: NETDATA.googleInitialize,
			create: NETDATA.googleChartCreate,
			update: NETDATA.googleChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'datatable'; },
			options: function(state) { return ''; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 300; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 4; }
		},
		"raphael": {
			initialize: NETDATA.raphaelInitialize,
			create: NETDATA.raphaelChartCreate,
			update: NETDATA.raphaelChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'json'; },
			options: function(state) { return ''; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 5000; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 3; }
		},
		"easypiechart": {
			initialize: NETDATA.easypiechartInitialize,
			create: NETDATA.easypiechartChartCreate,
			update: NETDATA.easypiechartChartUpdate,
			setSelection: function(t) { return true; },
			clearSelection: function() { return true; },
			initialized: false,
			enabled: true,
			format: function(state) { return 'json'; },
			options: function(state) { return ''; },
			legend: function(state) { return null; },
			autoresize: function(state) { return false; },
			max_updates_to_recreate: function(state) { return 5000; },
			track_colors: function(state) { return false; },
			pixels_per_point: function(state) { return 3; }
		}
	};

	NETDATA.registerChartLibrary = function(library, url) {
		if(NETDATA.options.debug.libraries === true)
			console.log("registering chart library: " + library);

		NETDATA.chartLibraries[library].url = url;
		NETDATA.chartLibraries[library].initialized = true;
		NETDATA.chartLibraries[library].enabled = true;
	}

	// ----------------------------------------------------------------------------------------------------------------
	// Start up

	NETDATA.requiredJs = [
		{
			url: NETDATA.serverDefault + 'lib/bootstrap.min.js',
			isAlreadyLoaded: function() {
				if(typeof $().emulateTransitionEnd == 'function')
					return true;
				else {
					if(typeof netdataNoBootstrap !== 'undefined' && netdataNoBootstrap)
						return true;
					else
						return false;
				}
			}
		},
		{
			url: NETDATA.serverDefault + 'lib/jquery.nanoscroller.min.js',
			isAlreadyLoaded: function() { return false; }
		},
		{
			url: NETDATA.serverDefault + 'lib/bootstrap-toggle.min.js',
			isAlreadyLoaded: function() { return false; }
		}
	];

	NETDATA.requiredCSS = [
		{
			url: NETDATA.serverDefault + 'css/bootstrap.min.css',
			isAlreadyLoaded: function() {
				if(typeof netdataNoBootstrap !== 'undefined' && netdataNoBootstrap)
					return true;
				else
					return false;
			}
		},
		{
			url: NETDATA.serverDefault + 'css/font-awesome.min.css',
			isAlreadyLoaded: function() { return false; }
		},
		{
			url: NETDATA.dashboard_css,
			isAlreadyLoaded: function() { return false; }
		},
		{
			url: NETDATA.serverDefault + 'css/bootstrap-toggle.min.css',
			isAlreadyLoaded: function() { return false; }
		}
	];

	NETDATA.loadRequiredJs = function(index, callback) {
		if(index >= NETDATA.requiredJs.length)  {
			if(typeof callback === 'function')
				callback();
			return;
		}

		if(NETDATA.requiredJs[index].isAlreadyLoaded()) {
			NETDATA.loadRequiredJs(++index, callback);
			return;
		}

		if(NETDATA.options.debug.main_loop === true)
			console.log('loading ' + NETDATA.requiredJs[index].url);

		$.ajax({
			url: NETDATA.requiredJs[index].url,
			cache: true,
			dataType: "script"
		})
		.success(function() {
			if(NETDATA.options.debug.main_loop === true)
				console.log('loaded ' + NETDATA.requiredJs[index].url);

			NETDATA.loadRequiredJs(++index, callback);
		})
		.fail(function() {
			alert('Cannot load required JS library: ' + NETDATA.requiredJs[index].url);
		})
	}

	NETDATA.loadRequiredCSS = function(index) {
		if(index >= NETDATA.requiredCSS.length)
			return;

		if(NETDATA.requiredCSS[index].isAlreadyLoaded()) {
			NETDATA.loadRequiredCSS(++index);
			return;
		}

		if(NETDATA.options.debug.main_loop === true)
			console.log('loading ' + NETDATA.requiredCSS[index].url);

		NETDATA._loadCSS(NETDATA.requiredCSS[index].url);
		NETDATA.loadRequiredCSS(++index);
	}

	NETDATA.errorReset();
	NETDATA.loadRequiredCSS(0);

	NETDATA._loadjQuery(function() {
		NETDATA.loadRequiredJs(0, function() {
			// keep a copy of the default settings
			NETDATA.options.defaults = $.extend({}, NETDATA.options.current);

			// read settings from local storage
			NETDATA.objectToLocalStorage(NETDATA.options.current, 'options');

			// always start with this option enabled.
			NETDATA.setOption('stop_updates_when_focus_is_lost', true);

			if(typeof netdataDontStart === 'undefined' || !netdataDontStart) {
				if(NETDATA.options.debug.main_loop === true)
					console.log('starting chart refresh thread');

				NETDATA.start();
			}

			if(typeof NETDATA.options.readyCallback === 'function')
				NETDATA.options.readyCallback();
		});
	});

	// window.NETDATA = NETDATA;
// })(window, document);
