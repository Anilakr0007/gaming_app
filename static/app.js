const matchList = document.querySelector('#match-list');
const featured = document.querySelector('#featured-match');
const tabs = [...document.querySelectorAll('.tab')];
const searchInput = document.querySelector('#match-search');
const matchDialog = document.querySelector('#match-dialog');
const updateDialog = document.querySelector('#update-dialog');
const scoreForm = document.querySelector('#score-form');
let matches = [];
let activeFilter = 'ALL';

const formatScore = (score) => `${score.runs}/${score.wickets}<span> (${score.overs})</span>`;

function renderFeatured(match) {
  if (!match) {
    featured.innerHTML = '<div class="featured-inner"><p>No live match right now.</p></div>';
    return;
  }
  const [first, second] = match.teams;
  featured.innerHTML = `
    <div class="featured-inner">
      <div>
        <div class="feature-kicker"><span class="live-dot"></span>${match.series} <span>·</span> ${match.format}</div>
        <div class="feature-matchup">
          <div class="feature-side"><span class="team-crest" style="background:${match.colors[first]}">${match.short_names[first]}</span><div><strong>${match.short_names[first]}</strong><small>${first}</small></div></div>
          <div class="feature-score"><strong>${match.scores[first].runs}/${match.scores[first].wickets}</strong><span>(${match.scores[first].overs})</span></div>
          <span class="versus">v</span>
          <div class="feature-score"><strong>${match.scores[second].runs}/${match.scores[second].wickets}</strong><span>(${match.scores[second].overs})</span></div>
          <div class="feature-side"><span class="team-crest" style="background:${match.colors[second]}">${match.short_names[second]}</span><div><strong>${match.short_names[second]}</strong><small>${second}</small></div></div>
        </div>
        <p class="feature-status">${match.summary}</p>
        <p class="feature-place">${match.venue}</p>
      </div>
      <div class="feature-divider"><label>THE MATCH, RIGHT NOW</label><strong>${match.summary}</strong><a href="#match-${match.id}" data-open-match="${match.id}">Full scorecard <span>→</span></a></div>
    </div>`;
}

function renderMatches() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = matches.filter((match) => {
    const filterMatches = activeFilter === 'ALL' || match.status === activeFilter;
    const searchable = `${match.series} ${match.teams.join(' ')} ${match.venue}`.toLowerCase();
    return filterMatches && searchable.includes(query);
  });
  matchList.innerHTML = filtered.length ? filtered.map((match, index) => {
    const live = match.status === 'LIVE';
    return `<article class="match-card" id="match-${match.id}" tabindex="0" role="button" data-match-id="${match.id}" style="animation-delay:${index * 45}ms">
      <div><div class="match-meta"><span class="status-label ${live ? 'live' : ''}">${match.status === 'RESULT' ? 'RESULT' : match.status}</span><span class="meta-divider">·</span><span class="match-series">${match.series} · ${match.format}</span></div>
      <div class="card-teams">${match.teams.map((team) => `<span class="team-short" style="color:${match.colors[team]}">${match.short_names[team]}</span><span class="team-full">${team}</span><span class="team-score">${live || match.status === 'RESULT' ? formatScore(match.scores[team]) : '—'}</span>`).join('')}</div>
      <p class="match-summary">${match.summary}</p></div>
      <div class="match-card-side"><span class="match-time">${match.status === 'UPCOMING' ? match.start_time : match.status === 'LIVE' ? 'In progress' : 'Full scorecard'}</span><span class="arrow-button" aria-hidden="true">↗</span></div>
    </article>`;
  }).join('') : '<p class="empty-state">No matches found. Try another filter or search.</p>';
}

function render() {
  const liveMatches = matches.filter((match) => match.status === 'LIVE');
  renderFeatured(liveMatches.find((match) => match.highlight) || liveMatches[0]);
  renderMatches();
  document.querySelector('#live-count').textContent = liveMatches.length;
  document.querySelector('#tab-live-count').textContent = liveMatches.length;
  document.querySelector('#upcoming-count').textContent = matches.filter((match) => match.status === 'UPCOMING').length;
  document.querySelector('#result-count').textContent = matches.filter((match) => match.status === 'RESULT').length;
  document.querySelector('#all-count').textContent = matches.length;
}

async function loadMatches() {
  const response = await fetch('/api/matches');
  if (!response.ok) throw new Error('Could not load scores. Refresh to try again.');
  matches = await response.json();
  render();
}

function renderConditions(match) {
  const conditions = match.conditions;
  if (!conditions) {
    return `<section class="conditions-panel"><div class="conditions-heading"><h3>Conditions &amp; outlook</h3><span class="conditions-tag">NO REPORT</span></div><p class="conditions-unavailable">Conditions have not been added for this match yet.</p><small>Weather and pitch information are sample data in this app.</small></section>`;
  }

  const rainChance = Number(conditions.rain_chance_pct) || 0;
  const weatherAngle = rainChance >= 50
    ? 'Higher chance of interruptions; keep an eye on delays or a revised target.'
    : rainChance >= 25
      ? 'Some shower risk; conditions could interrupt play.'
      : 'Low rain risk in this sample forecast.';
  const pitchText = String(conditions.pitch || '').toLowerCase();
  const pitchAngle = /seam|green|carry/.test(pitchText)
    ? 'The surface may offer early movement to pace bowlers.'
    : /slow|used|dry/.test(pitchText)
      ? 'The surface may grip more as play continues, bringing spin and cutters into play.'
      : /batting|flat/.test(pitchText)
        ? 'A truer surface may help batters score freely if they settle in.'
        : 'Conditions look balanced; the first few overs should reveal how the pitch is playing.';

  return `<section class="conditions-panel">
    <div class="conditions-heading"><h3>Conditions &amp; outlook</h3><span class="conditions-tag">SAMPLE REPORT</span></div>
    <div class="conditions-grid">
      <div class="condition-item"><span>Weather</span><strong>${conditions.weather || 'Not reported'}</strong></div>
      <div class="condition-item"><span>Temperature</span><strong>${conditions.temperature_c ?? '—'}°C</strong></div>
      <div class="condition-item"><span>Rain chance</span><strong>${conditions.rain_chance_pct ?? '—'}%</strong></div>
      <div class="condition-item"><span>Humidity / wind</span><strong>${conditions.humidity_pct ?? '—'}% · ${conditions.wind_kph ?? '—'} km/h</strong></div>
      <div class="condition-item condition-pitch"><span>Pitch report · ${conditions.pitch || 'Not reported'}</span><p>${conditions.pitch_report || 'No pitch note has been added.'}</p></div>
    </div>
    <div class="condition-outlook"><span>PLAYING CONDITIONS</span><p>${weatherAngle} ${pitchAngle}</p></div>
    <small>Conditions-based insight only; not a match-result prediction. Sample values, not live observations.</small>
  </section>`;
}

function openMatch(matchId) {
  const match = matches.find((item) => item.id === matchId);
  if (!match) return;
  document.querySelector('#dialog-content').innerHTML = `
    <div class="dialog-match-head"><p class="eyebrow">${match.series} · ${match.format}</p><h2 id="dialog-title">${match.teams.join(' vs ')}</h2><p>${match.venue}</p></div>
    <div class="dialog-scores">${match.teams.map((team) => `<div class="dialog-score-row"><div><strong style="color:${match.colors[team]}">${match.short_names[team]}</strong><br><small>${team} · RR ${match.scores[team].run_rate}</small></div><strong>${formatScore(match.scores[team])}</strong></div>`).join('')}</div>
    ${renderConditions(match)}
    <p class="dialog-result">${match.summary}</p><div class="dialog-actions"><button type="button" data-edit-match="${match.id}">Update this score</button><button class="secondary" type="button" data-close-dialog>Close</button></div>`;
  matchDialog.showModal();
}

function openUpdater(matchId) {
  const select = document.querySelector('#match-select');
  select.innerHTML = matches.map((match) => `<option value="${match.id}">${match.teams.join(' vs ')} · ${match.format}</option>`).join('');
  if (matchId) select.value = matchId;
  syncTeamOptions();
  updateDialog.showModal();
}

function syncTeamOptions() {
  const match = matches.find((item) => item.id === document.querySelector('#match-select').value);
  const teamSelect = document.querySelector('#team-select');
  const previous = teamSelect.value;
  teamSelect.innerHTML = match.teams.map((team) => `<option value="${team}">${team}</option>`).join('');
  if (match.teams.includes(previous)) teamSelect.value = previous;
  const score = match.scores[teamSelect.value];
  scoreForm.elements.runs.value = score.runs;
  scoreForm.elements.wickets.value = score.wickets;
  scoreForm.elements.overs.value = score.overs;
  document.querySelector('#form-error').textContent = '';
}

tabs.forEach((tab) => tab.addEventListener('click', () => {
  activeFilter = tab.dataset.filter;
  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-selected', String(selected));
  });
  renderMatches();
}));
searchInput.addEventListener('input', renderMatches);
document.querySelector('#refresh-button').addEventListener('click', () => loadMatches().catch(showLoadError));
document.querySelector('#manage-scores').addEventListener('click', () => openUpdater());
document.querySelector('#match-select').addEventListener('change', syncTeamOptions);
document.querySelector('#team-select').addEventListener('change', syncTeamOptions);
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

document.addEventListener('click', (event) => {
  const openLink = event.target.closest('[data-open-match]');
  const matchCard = event.target.closest('[data-match-id]');
  const editButton = event.target.closest('[data-edit-match]');
  if (openLink) {
    event.preventDefault();
    openMatch(openLink.dataset.openMatch);
  } else if (editButton) {
    const matchId = editButton.dataset.editMatch;
    matchDialog.close();
    openUpdater(matchId);
  } else if (matchCard) {
    openMatch(matchCard.dataset.matchId);
  } else if (event.target.closest('[data-close-dialog]')) {
    matchDialog.close();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('.match-card')) openMatch(event.target.dataset.matchId);
});

scoreForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(scoreForm);
  const matchId = formData.get('match');
  const response = await fetch(`/api/matches/${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team: formData.get('team'), runs: Number(formData.get('runs')), wickets: Number(formData.get('wickets')), overs: formData.get('overs') }),
  });
  const result = await response.json();
  if (!response.ok) {
    document.querySelector('#form-error').textContent = result.error;
    return;
  }
  matches = matches.map((match) => match.id === result.id ? result : match);
  updateDialog.close();
  render();
});

function showLoadError(error) {
  matchList.innerHTML = `<p class="empty-state">${error.message}</p>`;
}

loadMatches().catch(showLoadError);
window.setInterval(() => loadMatches().catch((error) => console.warn(error.message)), 30000);