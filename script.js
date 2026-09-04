(function () {
  'use strict';

  var DEFAULTS = {
    baseSalary: 6450,
    payrollPct: 28,
    techStack: 625,
    mgmtQA: 1600,
    recruiting: 2250,
    attrition: 39,
  };

  var RANGES = {
    baseSalary: { min: 4500, max: 8500, step: 50 },
    payrollPct: { min: 20, max: 35, step: 1 },
    techStack: { min: 300, max: 1000, step: 25 },
    mgmtQA: { min: 900, max: 2400, step: 50 },
    recruiting: { min: 1000, max: 3500, step: 50 },
    attrition: { min: 15, max: 60, step: 1 },
  };

  var DD_RATE_TIERS = { 1: 11500, 2: 11000, 3: 10750, 4: 10250 };

  function ddRateForTeam(teamSize) {
    return DD_RATE_TIERS[teamSize] != null ? DD_RATE_TIERS[teamSize] : 10000;
  }

  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  var STORAGE_KEY = 'sdr-roi-calculator-state';

  function loadStoredState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore persistence failures (private browsing, quota, etc.) */
    }
  }

  var stored = loadStoredState();

  var state = {
    teamSize: 3,
    values: Object.assign({}, DEFAULTS),
    useAvg: {
      baseSalary: true, payrollPct: true, techStack: true,
      mgmtQA: true, recruiting: true, attrition: true,
    },
  };

  if (stored) {
    if (typeof stored.teamSize === 'number') state.teamSize = stored.teamSize;
    if (stored.values) state.values = Object.assign({}, DEFAULTS, stored.values);
    if (stored.useAvg) state.useAvg = Object.assign({}, state.useAvg, stored.useAvg);
  }

  var SLIDER_DEFS = [
    { key: 'baseSalary', label: 'Base salary + commission', unit: '$' },
    { key: 'payrollPct', label: 'Payroll tax & benefits', unit: 'pct' },
    { key: 'techStack', label: 'Tech stack & data seats', unit: '$' },
    { key: 'mgmtQA', label: 'Management & QA oversight', unit: '$' },
    { key: 'recruiting', label: 'Recruiting, onboarding & turnover', unit: '$' },
    { key: 'attrition', label: 'Annual attrition rate', unit: 'pct' },
  ];

  var DD_INCLUDED_ITEMS = [
    { label: 'Dedicated, trained SDR talent', value: 'included' },
    { label: 'Program & performance management', value: 'included' },
    { label: 'Full tech & data stack*', value: 'included' },
    { label: 'Reporting & QA', value: 'included' },
    { label: 'Recruiting, onboarding & turnover risk', value: 'carried by us' },
  ];

  var sliderRowsEl = document.getElementById('sliderRows');
  var ddIncludedRowsEl = document.getElementById('ddIncludedRows');
  var teamSizeSlider = document.getElementById('teamSizeSlider');

  var sliderRowRefs = {};

  function buildSliderRows() {
    SLIDER_DEFS.forEach(function (def) {
      var row = document.createElement('div');
      row.className = 'slider-row';

      var top = document.createElement('div');
      top.className = 'slider-row-top';

      var label = document.createElement('div');
      label.className = 'slider-row-label';
      label.textContent = def.label;

      var value = document.createElement('div');
      value.className = 'slider-row-value';

      top.appendChild(label);
      top.appendChild(value);
      row.appendChild(top);

      var helper = document.createElement('div');
      helper.className = 'slider-row-helper';
      helper.style.display = 'none';
      row.appendChild(helper);

      var controls = document.createElement('div');
      controls.className = 'slider-row-controls';

      var range = document.createElement('input');
      range.type = 'range';
      range.className = 'dd-range';
      range.min = String(RANGES[def.key].min);
      range.max = String(RANGES[def.key].max);
      range.step = String(RANGES[def.key].step);
      range.value = String(state.values[def.key]);
      range.style.flex = '1';

      range.addEventListener('input', function (e) {
        state.values[def.key] = Number(e.target.value);
        render();
        saveState();
      });

      var avgLabel = document.createElement('label');
      avgLabel.className = 'use-avg-label';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.useAvg[def.key];

      checkbox.addEventListener('change', function () {
        var next = !state.useAvg[def.key];
        state.useAvg[def.key] = next;
        if (next) state.values[def.key] = DEFAULTS[def.key];
        render();
        saveState();
      });

      avgLabel.appendChild(checkbox);
      avgLabel.appendChild(document.createTextNode('use average'));

      controls.appendChild(range);
      controls.appendChild(avgLabel);
      row.appendChild(controls);

      sliderRowsEl.appendChild(row);

      sliderRowRefs[def.key] = { value: value, helper: helper, range: range, checkbox: checkbox };
    });
  }

  function buildDdIncludedRows() {
    DD_INCLUDED_ITEMS.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'dd-row';

      var label = document.createElement('div');
      label.textContent = item.label;

      var value = document.createElement('div');
      value.className = 'dd-row-value';
      value.textContent = item.value;

      row.appendChild(label);
      row.appendChild(value);
      ddIncludedRowsEl.appendChild(row);
    });
  }

  var teamSizeDisplayEl = document.getElementById('teamSizeDisplay');
  var teamSizeSuffixEl = document.getElementById('teamSizeSuffix');
  var inHouseMonthlyPerRepEl = document.getElementById('inHouseMonthlyPerRep');
  var ddMonthlyPerRepEl = document.getElementById('ddMonthlyPerRep');
  var savingsHeadlineEl = document.getElementById('savingsHeadline');
  var savingsDescEl = document.getElementById('savingsDesc');
  var savingsPerRepMonthlyEl = document.getElementById('savingsPerRepMonthly');
  var savingsPerRepAnnualEl = document.getElementById('savingsPerRepAnnual');
  var savingsTeamMonthlyEl = document.getElementById('savingsTeamMonthly');
  var savingsTeamAnnualEl = document.getElementById('savingsTeamAnnual');

  function render() {
    var v = state.values;
    var teamSize = state.teamSize;
    var ddRate = ddRateForTeam(teamSize);

    var payrollBenefits = v.baseSalary * (v.payrollPct / 100);
    var recruitingAdjusted = v.recruiting * (v.attrition / DEFAULTS.attrition);

    var inHouseMonthlyPerRep = v.baseSalary + payrollBenefits + v.techStack + v.mgmtQA + recruitingAdjusted;
    var ddMonthlyPerRep = ddRate;

    var savingsPerRepMonthly = inHouseMonthlyPerRep - ddMonthlyPerRep;
    var savingsPerRepAnnual = savingsPerRepMonthly * 12;
    var savingsTeamMonthly = savingsPerRepMonthly * teamSize;
    var savingsTeamAnnual = savingsPerRepAnnual * teamSize;

    var teamSizeDisplay = teamSize >= 5 ? '5+' : String(teamSize);
    var teamSizeSuffix = teamSize === 1 ? '' : 's';

    teamSizeDisplayEl.textContent = teamSizeDisplay;
    teamSizeSuffixEl.textContent = teamSizeSuffix;
    teamSizeSlider.value = String(teamSize);

    inHouseMonthlyPerRepEl.textContent = fmt(inHouseMonthlyPerRep);
    ddMonthlyPerRepEl.textContent = fmt(ddMonthlyPerRep);

    SLIDER_DEFS.forEach(function (def) {
      var refs = sliderRowRefs[def.key];
      var val = v[def.key];
      var displayValue;
      var helperText = null;

      if (def.key === 'payrollPct') {
        displayValue = fmt(payrollBenefits) + '/mo (' + val + '%)';
      } else if (def.key === 'recruiting') {
        displayValue = fmt(recruitingAdjusted) + '/mo';
        helperText = 'amortized at ' + v.attrition + '% annual attrition';
      } else if (def.unit === 'pct') {
        displayValue = val + '%';
      } else {
        displayValue = fmt(val) + '/mo';
      }

      refs.value.textContent = displayValue;

      if (helperText) {
        refs.helper.textContent = helperText;
        refs.helper.style.display = '';
      } else {
        refs.helper.style.display = 'none';
      }

      refs.range.value = String(val);
      refs.range.disabled = state.useAvg[def.key];
      refs.range.style.opacity = state.useAvg[def.key] ? '0.45' : '1';
      refs.checkbox.checked = state.useAvg[def.key];
    });

    savingsHeadlineEl.textContent = savingsPerRepAnnual >= 0
      ? 'Save roughly ' + fmt(savingsPerRepAnnual) + ' a year, per rep.'
      : 'demandDrive costs ' + fmt(Math.abs(savingsPerRepAnnual)) + ' more a year, per rep.';

    savingsDescEl.textContent = 'Based on your in-house cost of ' + fmt(inHouseMonthlyPerRep) + '/mo per rep versus demandDrive’s flat ' +
      fmt(ddMonthlyPerRep) + '/mo, across ' + teamSize + ' SDR' + teamSizeSuffix + '.';

    savingsPerRepMonthlyEl.textContent = fmt(Math.abs(savingsPerRepMonthly));
    savingsPerRepAnnualEl.textContent = fmt(Math.abs(savingsPerRepAnnual));
    savingsTeamMonthlyEl.textContent = fmt(Math.abs(savingsTeamMonthly));
    savingsTeamAnnualEl.textContent = fmt(Math.abs(savingsTeamAnnual));
  }

  teamSizeSlider.value = String(state.teamSize);
  teamSizeSlider.addEventListener('input', function (e) {
    state.teamSize = Number(e.target.value);
    render();
    saveState();
  });

  buildSliderRows();
  buildDdIncludedRows();
  render();
})();
