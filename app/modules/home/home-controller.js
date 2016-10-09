import FirebaseReporting from 'firebase-reporting';
import firebase from 'firebase';

export default class HomeController {
  constructor($firebaseRef, $firebaseAuth, $firebaseArray, $timeout, BaseAppsApi) {
    this.authService = $firebaseAuth(firebase.auth());
    this.$timeout = $timeout;
    this.authLoaded = false;
    this.totalClicks = null;
    this.totalUsers = null;
    this.lastClicked = null;
    this.data = $firebaseArray($firebaseRef.default.child('data'));

    const init = () => {
      this.authLoaded = true;

      this.reportingService = new FirebaseReporting({
        firebase: $firebaseRef.default.child('reporting')
      });
      this.initReportingService();

      BaseAppsApi.subscribe('resize', () => this.draw());
      this.data.$watch(() => this.draw());

      this.draw();
    };

    this.authService.$requireSignIn()
      .then(() => init())
      .catch(() => this.authService.$signInAnonymously().then(() => init()));

    return this;
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

  draw() {
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

HomeController.$inject = ['$firebaseRef', '$firebaseAuth', '$firebaseArray', '$timeout', 'BaseAppsApi'];
