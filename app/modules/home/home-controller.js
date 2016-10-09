import FirebaseReporting from 'firebase-reporting';
import firebase from 'firebase';

export default class HomeController {
  constructor($firebaseRef, $firebaseAuth, $firebaseArray, $timeout, $q) {
    this.authService = $firebaseAuth(firebase.auth());
    this.$timeout = $timeout;
    this.$q = $q;
    this.authLoaded = false;
    this.totalClicks = null;
    this.totalUsers = null;
    this.lastClicked = null;
    this.data = $firebaseArray($firebaseRef.default.child('data'));
    this.reportingService = new FirebaseReporting({
      firebase: $firebaseRef.default.child('reporting')
    });

    this.authService.$requireSignIn()
      .then(() => this.init())
      .catch(() => this.authService.$signInAnonymously().then(() => this.init()));

    this.piechart = {
      type: 'PieChart',
      data: {
        'cols': [
          {label: 'Button', type: 'string'},
          {label: 'Times Clicked', type: 'number'}
        ],
        'rows': []
      },
      options: {
        legend: {
          position: 'bottom'
        }
      }
    };
    this.linecharts = {};
    this.linecharts.minute = {
      type: 'LineChart',
      data: {
        'cols': [
          {label: 'Time', type: 'date'},
          {label: 'A', type: 'number'},
          {label: 'B', type: 'number'},
          {label: 'C', type: 'number'},
          {label: 'D', type: 'number'}
        ],
        'rows': []
      },
      options: {
        title: 'Clicked this Hour',
        legend: {
          position: 'bottom'
        }
      }
    };
    this.linecharts.hour = {
      type: 'LineChart',
      data: {
        'cols': [
          {label: 'Time', type: 'date'},
          {label: 'A', type: 'number'},
          {label: 'B', type: 'number'},
          {label: 'C', type: 'number'},
          {label: 'D', type: 'number'}
        ],
        'rows': []
      },
      options: {
        title: 'Clicked Today',
        legend: {
          position: 'bottom'
        }
      }
    };
    this.linecharts.day = {
      type: 'LineChart',
      data: {
        'cols': [
          {label: 'Time', type: 'date'},
          {label: 'A', type: 'number'},
          {label: 'B', type: 'number'},
          {label: 'C', type: 'number'},
          {label: 'D', type: 'number'}
        ],
        'rows': []
      },
      options: {
        title: 'Clicked this Month',
        legend: {
          position: 'bottom'
        }
      }
    };
    this.linecharts.week = {
      type: 'LineChart',
      data: {
        'cols': [
          {label: 'Time', type: 'date'},
          {label: 'A', type: 'number'},
          {label: 'B', type: 'number'},
          {label: 'C', type: 'number'},
          {label: 'D', type: 'number'}
        ],
        'rows': []
      },
      options: {
        title: 'Clicked this Year',
        legend: {
          position: 'bottom'
        }
      }
    };

    return this;
  }

  init() {
    this.authLoaded = true;
    this.initReportingService();
    this.data.$watch(() => this.drawAll());
    this.drawAll();
  }

  buttonClicked(button) {
    const data = {
      uid: this.authService.$getAuth().uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      anyclicked: 1
    };
    data[button + 'clicked'] = 1;

    // save metrics first to ensure onDataSaved callback
    // is called after metrics have been calculated
    this.reportingService.saveMetrics(data).then(() => {
      this.data.$add(data);
    });
  }

  drawAll() {
    this.drawMetrics();
    this.drawCharts();
  }

  drawMetrics() {
    this.reportingService.filter().sum('anyclicked').select(1).then((values) => {
      this.$timeout(() => this.totalClicks = values[0] || 0);
    });
    this.reportingService.filter('users').sum('anyclicked').count().then((value) => {
      this.$timeout(() => this.totalUsers = value || 0);
    });
    this.reportingService.filter().last('timestamp').select(1).then((values) => {
      this.$timeout(() => this.lastClicked = values[0] ? values[0] : null);
    });
  }

  drawCharts() {
    this.drawPieChart();
    this.drawLineChart('minute');
    this.drawLineChart('hour');
    this.drawLineChart('day');
    this.drawLineChart('week');
  }

  drawPieChart() {
    const aClickedQuery = this.reportingService.filter().sum('aclicked').value();
    const bClickedQuery = this.reportingService.filter().sum('bclicked').value();
    const cClickedQuery = this.reportingService.filter().sum('cclicked').value();
    const dClickedQuery = this.reportingService.filter().sum('dclicked').value();

    this.$q.all([aClickedQuery, bClickedQuery, cClickedQuery, dClickedQuery]).then((values) => {
      this.$timeout(() => {
        this.piechart.data.rows.splice(0, this.piechart.data.rows.length);
        this.piechart.data.rows.push({ c: [{ v: 'A' }, {v: values[0] }] });
        this.piechart.data.rows.push({ c: [{ v: 'B' }, {v: values[1] }] });
        this.piechart.data.rows.push({ c: [{ v: 'C' }, {v: values[2] }] });
        this.piechart.data.rows.push({ c: [{ v: 'D' }, {v: values[3] }] });
      });
    });
  }

  drawLineChart(during) {
    const queryStartTime = new Date();
    const queryEndTime = new Date();
    queryStartTime.setMilliseconds(0);
    queryStartTime.setSeconds(0);
    queryStartTime.setMinutes(0);

    switch (during) {
      case 'minute':
        queryEndTime.setTime(queryStartTime.getTime());
        queryEndTime.setHours(queryStartTime.getHours() + 1);
        break;
      case 'hour':
        queryStartTime.setHours(0);
        queryEndTime.setTime(queryStartTime.getTime());
        queryEndTime.setDate(queryStartTime.getDate() + 1);
        break;
      case 'day':
        queryStartTime.setHours(0);
        queryStartTime.setDate(1);
        queryEndTime.setTime(queryStartTime.getTime());
        queryEndTime.setMonth(queryStartTime.getMonth() + 1);
        break;
      case 'week':
        queryStartTime.setHours(0);
        queryStartTime.setDate(1);
        queryStartTime.setMonth(1);
        queryEndTime.setTime(queryStartTime.getTime());
        queryEndTime.setFullYear(queryStartTime.getFullYear() + 1);
        break;
    }

    const aClickedQuery = this.reportingService.filter().sum('aclicked').during(during).range(queryStartTime.getTime(), queryEndTime.getTime()).values(true);
    const bClickedQuery = this.reportingService.filter().sum('bclicked').during(during).range(queryStartTime.getTime(), queryEndTime.getTime()).values(true);
    const cClickedQuery = this.reportingService.filter().sum('cclicked').during(during).range(queryStartTime.getTime(), queryEndTime.getTime()).values(true);
    const dClickedQuery = this.reportingService.filter().sum('dclicked').during(during).range(queryStartTime.getTime(), queryEndTime.getTime()).values(true);

    this.$q.all([aClickedQuery, bClickedQuery, cClickedQuery, dClickedQuery]).then((values) => {
      this.linecharts[during].data.rows.splice(0, this.linecharts[during].data.rows.length);
      for (var i = 0; i < values[0].length; i++) {
        this.linecharts[during].data.rows.push({
          c: [{
            v: new Date(values[0][i].timestamp)
          }, {
            v: values[0][i].value
          }, {
            v: values[1][i].value
          }, {
            v: values[2][i].value
          }, {
            v: values[3][i].value
          }]
        });
      }
    });
  }

  initReportingService() {
    // Add report filter for users
    this.reportingService.addFilter('users', ['uid']);

    // Metrics for timing
    this.reportingService.addMetric('timestamp', ['first', 'last']);

    // Metrics for ANY button clicked
    this.reportingService.addMetric('anyclicked', ['sum']);
    this.reportingService.enableRetainer('minute', 'anyclicked', ['sum']);
    this.reportingService.enableRetainer('hour', 'anyclicked', ['sum']);
    this.reportingService.enableRetainer('day', 'anyclicked', ['sum']);
    this.reportingService.enableRetainer('week', 'anyclicked', ['sum']);

    // Metrics for A button clicked
    this.reportingService.addMetric('aclicked', ['sum']);
    this.reportingService.enableRetainer('minute', 'aclicked', ['sum']);
    this.reportingService.enableRetainer('hour', 'aclicked', ['sum']);
    this.reportingService.enableRetainer('day', 'aclicked', ['sum']);
    this.reportingService.enableRetainer('week', 'aclicked', ['sum']);

    // Metrics for B button clicked
    this.reportingService.addMetric('bclicked', ['sum']);
    this.reportingService.enableRetainer('minute', 'bclicked', ['sum']);
    this.reportingService.enableRetainer('hour', 'bclicked', ['sum']);
    this.reportingService.enableRetainer('day', 'bclicked', ['sum']);
    this.reportingService.enableRetainer('week', 'bclicked', ['sum']);

    // Metrics for C button clicked
    this.reportingService.addMetric('cclicked', ['sum']);
    this.reportingService.enableRetainer('minute', 'cclicked', ['sum']);
    this.reportingService.enableRetainer('hour', 'cclicked', ['sum']);
    this.reportingService.enableRetainer('day', 'cclicked', ['sum']);
    this.reportingService.enableRetainer('week', 'cclicked', ['sum']);

    // Metrics for D button clicked
    this.reportingService.addMetric('dclicked', ['sum']);
    this.reportingService.enableRetainer('minute', 'dclicked', ['sum']);
    this.reportingService.enableRetainer('hour', 'dclicked', ['sum']);
    this.reportingService.enableRetainer('day', 'dclicked', ['sum']);
    this.reportingService.enableRetainer('week', 'dclicked', ['sum']);
  }
}

HomeController.$inject = ['$firebaseRef', '$firebaseAuth', '$firebaseArray', '$timeout', '$q'];
