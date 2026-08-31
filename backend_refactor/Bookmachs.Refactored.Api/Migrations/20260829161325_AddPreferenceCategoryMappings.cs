using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPreferenceCategoryMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "MasterPreferenceTags",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "MasterPreferenceTags",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PreferenceCategoryMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MasterPreferenceTagId = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    CategoryName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    SubcategoryId = table.Column<int>(type: "int", nullable: true),
                    SubcategoryName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreferenceCategoryMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreferenceCategoryMappings_MasterPreferenceTags_MasterPreferenceTagId",
                        column: x => x.MasterPreferenceTagId,
                        principalTable: "MasterPreferenceTags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceCategoryMappings_MasterPreferenceTagId",
                table: "PreferenceCategoryMappings",
                column: "MasterPreferenceTagId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreferenceCategoryMappings");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "MasterPreferenceTags");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "MasterPreferenceTags",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);
        }
    }
}
