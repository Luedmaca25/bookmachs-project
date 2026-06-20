using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Application.MasterPreferenceTags;
using Bookmachs.Application.MasterPreferenceTags.Commands;
using Bookmachs.Application.MasterPreferenceTags.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MasterPreferenceTagsController : ControllerBase
{
    private readonly ISender _mediator;

    public MasterPreferenceTagsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterPreferenceTagDto>>> GetAll([FromQuery] bool onlyActive = false)
    {
        var result = await _mediator.Send(new GetMasterPreferenceTagsQuery(onlyActive));
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<MasterPreferenceTagDto>> Create([FromBody] CreateMasterPreferenceTagCommand command)
    {
        // Early return for invalid payloads
        if (command == null || string.IsNullOrWhiteSpace(command.Name))
        {
            return BadRequest("Los datos proporcionados para la creación de la etiqueta no son válidos.");
        }

        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<MasterPreferenceTagDto>> Update(int id, [FromBody] UpdateMasterPreferenceTagCommand command)
    {
        // Early return validations
        if (command == null || id != command.Id || string.IsNullOrWhiteSpace(command.Name))
        {
            return BadRequest("Los datos para la actualización de la etiqueta no coinciden o no son válidos.");
        }

        try
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> Delete(int id)
    {
        try
        {
            var result = await _mediator.Send(new DeleteMasterPreferenceTagCommand(id));
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
