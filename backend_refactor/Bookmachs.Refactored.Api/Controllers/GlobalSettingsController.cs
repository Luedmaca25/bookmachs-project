using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GlobalSettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public GlobalSettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<ActionResult<GlobalSettingsDto>> Get()
    {
        var result = await _settingsService.GetGlobalSettingsAsync();
        return Ok(result);
    }

    [HttpPut]
    public async Task<ActionResult<GlobalSettingsDto>> Update([FromBody] GlobalSettingsDto settingsDto)
    {
        if (settingsDto == null)
        {
            return BadRequest("Los datos de configuración proporcionados no son válidos.");
        }

        var result = await _settingsService.UpdateGlobalSettingsAsync(settingsDto);
        return Ok(result);
    }
}
