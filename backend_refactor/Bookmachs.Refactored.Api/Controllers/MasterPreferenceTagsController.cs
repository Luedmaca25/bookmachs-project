using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class MasterPreferenceTagsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public MasterPreferenceTagsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterPreferenceTagDto>>> GetAll([FromQuery] bool onlyActive = false)
    {
        var result = await _settingsService.GetMasterPreferenceTagsAsync(onlyActive);
        return Ok(result);
    }

    [HttpGet("ecolectura-categories")]
    public async Task<ActionResult<IEnumerable<EcolecturaCategoryTreeDto>>> GetEcolecturaCategories()
    {
        var result = await _settingsService.GetEcolecturaCategoryTreeAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<MasterPreferenceTagDto>> Create([FromBody] CreatePreferenceTagRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Los datos proporcionados para la creación de la etiqueta no son válidos.");
        }

        var result = await _settingsService.CreateMasterPreferenceTagAsync(request);
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<MasterPreferenceTagDto>> Update(int id, [FromBody] UpdatePreferenceTagRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Los datos para la actualización de la etiqueta no son válidos.");
        }

        try
        {
            var result = await _settingsService.UpdateMasterPreferenceTagAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> Delete(int id)
    {
        try
        {
            var result = await _settingsService.DeleteMasterPreferenceTagAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
