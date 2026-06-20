using System.Threading.Tasks;
using Bookmachs.Application.GlobalSettings;
using Bookmachs.Application.GlobalSettings.Commands;
using Bookmachs.Application.GlobalSettings.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GlobalSettingsController : ControllerBase
{
    private readonly ISender _mediator;

    public GlobalSettingsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<GlobalSettingsDto>> Get()
    {
        var result = await _mediator.Send(new GetGlobalSettingsQuery());
        return Ok(result);
    }

    [HttpPut]
    public async Task<ActionResult<GlobalSettingsDto>> Update([FromBody] UpdateGlobalSettingsCommand command)
    {
        // Early return for basic validation
        if (command == null)
        {
            return BadRequest("Los datos de configuración proporcionados no son válidos.");
        }

        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
