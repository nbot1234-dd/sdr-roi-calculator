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

  function fmtCount(n) {
    return Math.ceil(n).toLocaleString('en-US');
  }

  var PRODUCTION_DEFAULTS = {
    meetingToOppRate: 30,
    closeRate: 25,
    salesCycle: 3,
    contractValue: 25000,
  };

  var PRODUCTION_RANGES = {
    meetingToOppRate: { min: 10, max: 60, step: 1 },
    closeRate: { min: 10, max: 50, step: 1 },
    salesCycle: { min: 1, max: 24, step: 1 },
    contractValue: { min: 5000, max: 250000, step: 5000 },
  };

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
    production: Object.assign({}, PRODUCTION_DEFAULTS),
  };

  if (stored) {
    if (typeof stored.teamSize === 'number') state.teamSize = stored.teamSize;
    if (stored.values) state.values = Object.assign({}, DEFAULTS, stored.values);
    if (stored.useAvg) state.useAvg = Object.assign({}, state.useAvg, stored.useAvg);
    if (stored.production) state.production = Object.assign({}, PRODUCTION_DEFAULTS, stored.production);
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

  var PRODUCTION_SLIDER_DEFS = [
    { key: 'meetingToOppRate', label: 'Meeting → opportunity rate', unit: 'pct' },
    { key: 'closeRate', label: 'Historical close rate', unit: 'pct' },
    { key: 'salesCycle', label: 'Average sales cycle length', unit: 'months', editable: true },
    { key: 'contractValue', label: 'Average contract value', unit: '$', editable: true },
  ];

  var sliderRowsEl = document.getElementById('sliderRows');
  var ddIncludedRowsEl = document.getElementById('ddIncludedRows');
  var productionSliderRowsEl = document.getElementById('productionSliderRows');
  var teamSizeSlider = document.getElementById('teamSizeSlider');

  var sliderRowRefs = {};
  var productionSliderRowRefs = {};

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

  function buildProductionSliderRows() {
    PRODUCTION_SLIDER_DEFS.forEach(function (def) {
      var row = document.createElement('div');
      row.className = 'slider-row';

      var top = document.createElement('div');
      top.className = 'slider-row-top';

      var label = document.createElement('div');
      label.className = 'slider-row-label';
      label.textContent = def.label;

      top.appendChild(label);

      var refs = { range: null };

      if (def.editable) {
        var valueWrap = document.createElement('div');
        valueWrap.className = 'slider-row-value slider-row-value-editable';

        var prefix = null;
        var suffix = null;

        if (def.unit === '$') {
          prefix = document.createElement('span');
          prefix.textContent = '$';
          valueWrap.appendChild(prefix);
        }

        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'slider-row-value-input';
        input.min = String(PRODUCTION_RANGES[def.key].min);
        input.step = String(PRODUCTION_RANGES[def.key].step);
        input.value = String(state.production[def.key]);
        valueWrap.appendChild(input);

        if (def.unit === 'months') {
          suffix = document.createElement('span');
          suffix.textContent = ' months';
          valueWrap.appendChild(suffix);
        }

        function commit(raw) {
          var num = Number(raw);
          if (raw === '' || isNaN(num)) num = PRODUCTION_DEFAULTS[def.key];
          if (num < PRODUCTION_RANGES[def.key].min) num = PRODUCTION_RANGES[def.key].min;
          state.production[def.key] = num;
          renderProduction();
          saveState();
        }

        input.addEventListener('input', function (e) {
          var num = Number(e.target.value);
          if (e.target.value === '' || isNaN(num)) return;
          state.production[def.key] = num;
          renderProduction();
          saveState();
        });

        input.addEventListener('change', function (e) {
          commit(e.target.value);
        });

        top.appendChild(valueWrap);
        refs.input = input;
        refs.suffix = suffix;
      } else {
        var value = document.createElement('div');
        value.className = 'slider-row-value';
        top.appendChild(value);
        refs.value = value;
      }

      row.appendChild(top);

      var controls = document.createElement('div');
      controls.className = 'slider-row-controls';

      var range = document.createElement('input');
      range.type = 'range';
      range.className = 'dd-range';
      range.min = String(PRODUCTION_RANGES[def.key].min);
      range.max = String(PRODUCTION_RANGES[def.key].max);
      range.step = String(PRODUCTION_RANGES[def.key].step);
      range.value = String(state.production[def.key]);
      range.style.flex = '1';

      range.addEventListener('input', function (e) {
        state.production[def.key] = Number(e.target.value);
        renderProduction();
        saveState();
      });

      controls.appendChild(range);
      row.appendChild(controls);

      productionSliderRowsEl.appendChild(row);

      refs.range = range;
      productionSliderRowRefs[def.key] = refs;
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

  var productionHeadlineEl = document.getElementById('productionHeadline');
  var productionDescEl = document.getElementById('productionDesc');
  var productionMeetingsPerRepEl = document.getElementById('productionMeetingsPerRep');
  var productionPaceMonthlyPerRepEl = document.getElementById('productionPaceMonthlyPerRep');
  var productionMeetingsTeamEl = document.getElementById('productionMeetingsTeam');
  var productionPaceMonthlyTeamEl = document.getElementById('productionPaceMonthlyTeam');

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

  function renderProduction() {
    var p = state.production;
    var teamSize = state.teamSize;
    var ddRate = ddRateForTeam(teamSize);
    var teamSizeSuffix = teamSize === 1 ? '' : 's';

    PRODUCTION_SLIDER_DEFS.forEach(function (def) {
      var refs = productionSliderRowRefs[def.key];
      var val = p[def.key];

      if (def.editable) {
        if (document.activeElement !== refs.input) {
          refs.input.value = String(val);
        }
        if (refs.suffix) {
          refs.suffix.textContent = val === 1 ? ' month' : ' months';
        }
      } else {
        var displayValue = def.unit === 'pct' ? val + '%' : fmt(val);
        refs.value.textContent = displayValue;
      }

      // Typed values can exceed the slider's default max — extend it so the
      // thumb still tracks the real value instead of clamping silently.
      if (val > Number(refs.range.max)) {
        refs.range.max = String(val);
      }
      refs.range.value = String(val);
    });

    var meetingToOppRate = p.meetingToOppRate / 100;
    var closeRate = p.closeRate / 100;
    var cycle = p.salesCycle;
    var contractValue = p.contractValue;

    var meetingsPerDeal = 1 / (meetingToOppRate * closeRate);
    var perRepInvestment = ddRate * cycle;
    var perRepDealsNeeded = perRepInvestment / contractValue;
    var perRepMeetingsNeeded = perRepDealsNeeded * meetingsPerDeal;
    var perRepPaceMonthly = perRepMeetingsNeeded / cycle;

    var teamMeetingsNeeded = perRepMeetingsNeeded * teamSize;
    var teamPaceMonthly = perRepPaceMonthly * teamSize;

    productionHeadlineEl.textContent = 'You need roughly ' + fmtCount(perRepMeetingsNeeded) + ' meetings over your ' +
      cycle + '-month sales cycle to cover demandDrive’s cost, per rep.';

    productionDescEl.textContent = 'Based on demandDrive’s ' + fmt(ddRate) + '/mo rate, a ' + p.meetingToOppRate +
      '% meeting-to-opportunity rate, ' + p.closeRate + '% close rate, ' + cycle + '-month sales cycle, and ' +
      fmt(contractValue) + ' average contract value, across ' + teamSize + ' SDR' + teamSizeSuffix + '.';

    productionMeetingsPerRepEl.textContent = fmtCount(perRepMeetingsNeeded);
    productionPaceMonthlyPerRepEl.textContent = perRepPaceMonthly.toFixed(1);
    productionMeetingsTeamEl.textContent = fmtCount(teamMeetingsNeeded);
    productionPaceMonthlyTeamEl.textContent = teamPaceMonthly.toFixed(1);
  }

  teamSizeSlider.value = String(state.teamSize);
  teamSizeSlider.addEventListener('input', function (e) {
    state.teamSize = Number(e.target.value);
    render();
    renderProduction();
    saveState();
  });

  var tabButtons = document.querySelectorAll('.tab-button');
  var tabPanels = {
    cost: document.getElementById('tab-cost'),
    production: document.getElementById('tab-production'),
  };

  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var target = button.getAttribute('data-tab');

      tabButtons.forEach(function (b) {
        var active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      Object.keys(tabPanels).forEach(function (key) {
        tabPanels[key].hidden = key !== target;
      });
    });
  });

  buildSliderRows();
  buildDdIncludedRows();
  buildProductionSliderRows();
  render();
  renderProduction();
})();
