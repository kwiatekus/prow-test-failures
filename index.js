$(function () {
  const root = $('#summary');
  const total = $('#total');
  const tableBody = $('#summary-table tbody');

  const STATUSES = {
    failed: 'Failed (Retried)',
    running: 'Running',
    retried: 'Succeeded (Retried)'
  };

  const summary = {
  };

  function isIntegrationJob(build) {
    return ["-integration", "-gke-minio-gateway", "-gke-upgrade", "-gke-central-connector"].some(suffix => build.job.endsWith(suffix))
  }

  function isFailure(build) {
    return build.state === 'failure'
  }

  function getBuildLogLink(build) {
    const path = build.url.split('/gcs/')[1];
    return `https://storage.googleapis.com/${path}/build-log.txt`
  }

  function updateJobSummary(jobName, statusKey, value) {
    let row = $(`#${jobName}`);

    if (!row.length) {
      tableBody.append(`<tr id="${jobName}"></tr>`);
      row = $(`#${jobName}`);
      row.append(`<td class="alert alert-dark">${jobName}</td>`);
      for (let statusKey in STATUSES) {
        row.append(`<td class="${statusKey}">0</td>`);
      }
    }

    console.log(jobName, statusKey, value);

    row.find(`.${statusKey}`).text(value)
  }

  function updateSummary(component, key) {
    if (!summary[component]) {
      summary[component] = {}
    }
    if (!summary[component][key]) {
      summary[component][key] = 0
    }
    summary[component][key] += 1;

    updateJobSummary(component, key, summary[component][key])
  }

  $.getScript("https://status.build.kyma-project.io/data.js?var=allBuilds", function () {
    const failedIntegrationJobs = allBuilds.filter(isIntegrationJob).filter(isFailure);
    const links = failedIntegrationJobs.map(getBuildLogLink);

    total.text(links.length);

    links.forEach(async link => {
      fetch(link)
        .then(rsp => rsp.text())
        .then(body => {
          const testSummaryIdx = body.indexOf('Test summary');
          return testSummaryIdx > -1 ? body.slice(testSummaryIdx, testSummaryIdx+1000) : null
        })
        .then( testSummary => {
          if (!testSummary) {
            return
          }

          const match = [...testSummary.matchAll('Test status: (.*) - (.*)')];
          match.forEach( m => {
            for (let statusKey in STATUSES) {
              if (m[2].indexOf(STATUSES[statusKey]) > -1) {
                updateSummary(m[1], statusKey)
              }
            }
          });
        })
    })
  });
});